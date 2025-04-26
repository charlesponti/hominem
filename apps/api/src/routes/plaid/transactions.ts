import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { plaidClient } from '../../services/plaid'

const itemIdParam = z.object({
  itemId: z.string(),
})

const webhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
}).passthrough()

/**
 * Register Plaid transaction-related routes
 */
export default async function plaidTransactionRoutes(fastify: FastifyInstance) {
  /**
   * Sync transactions for a specific item
   */
  fastify.post('/sync-transactions/:itemId', {
    schema: {
      params: itemIdParam,
      response: {
        200: z.object({
          status: z.string(),
          added: z.number(),
          modified: z.number(),
          removed: z.number(),
        }),
      },
    },
    handler: async (request, reply) => {
      try {
        const { itemId } = request.params as z.infer<typeof itemIdParam>
        const { user } = request.session

        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Get the connection to verify ownership
        const connection = await fastify.db.plaidConnections.findFirst({
          where: {
            itemId,
            userId: user.id,
          },
        })

        if (!connection) {
          return reply.status(404).send({ error: 'Connection not found' })
        }

        // Sync the transactions
        const result = await syncTransactionsForItem(itemId, connection.accessToken)
        return result
      } catch (error) {
        fastify.log.error(`Error syncing transactions: ${error}`)
        return reply.status(500).send({ error: 'Failed to sync transactions' })
      }
    },
  })

  /**
   * Webhook handler for Plaid transaction updates
   */
  fastify.post('/webhook', {
    schema: {
      body: webhookSchema,
    },
    handler: async (request, reply) => {
      try {
        const { webhook_type, webhook_code, item_id } = request.body as z.infer<typeof webhookSchema>

        fastify.log.info(`Received webhook: ${webhook_type} - ${webhook_code} for item ${item_id}`)

        if (webhook_type === 'TRANSACTIONS' && webhook_code === 'DEFAULT_UPDATE') {
          // Get the connection to fetch the access token
          const connection = await fastify.db.plaidConnections.findFirst({
            where: {
              itemId: item_id,
            },
          })

          if (!connection) {
            fastify.log.error(`Connection not found for item_id: ${item_id}`)
            return reply.status(404).send({ error: 'Connection not found' })
          }

          // Sync the transactions
          await syncTransactionsForItem(item_id, connection.accessToken)
        }

        return { received: true }
      } catch (error) {
        fastify.log.error(`Error processing webhook: ${error}`)
        return reply.status(500).send({ error: 'Failed to process webhook' })
      }
    },
  })

  /**
   * Get transactions for the current user
   */
  fastify.get('/transactions', {
    handler: async (request, reply) => {
      try {
        const { user } = request.session

        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        const transactions = await fastify.db.plaidTransactions.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            date: 'desc',
          },
          include: {
            account: {
              select: {
                name: true,
                mask: true,
              },
            },
          },
        })

        return { transactions }
      } catch (error) {
        fastify.log.error(`Error fetching transactions: ${error}`)
        return reply.status(500).send({ error: 'Failed to fetch transactions' })
      }
    },
  })

  /**
   * Sync transactions for a specific item
   */
  async function syncTransactionsForItem(itemId: string, accessToken: string) {
    try {
      // Get the connection to fetch user ID
      const connection = await fastify.db.plaidConnections.findFirst({
        where: {
          itemId,
        },
      })

      if (!connection) {
        throw new Error(`Connection not found for item_id: ${itemId}`)
      }

      // Get the cursor for the item if it exists
      const cursorRecord = await fastify.db.plaidSyncCursor.findFirst({
        where: {
          itemId,
        },
      })

      const cursor = cursorRecord?.cursor

      // Initial transaction sync
      const transactionsResponse = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
      })

      const { added, modified, removed, next_cursor, has_more } = transactionsResponse.data

      // Process added transactions
      for (const transaction of added) {
        await fastify.db.plaidTransactions.create({
          data: {
            transactionId: transaction.transaction_id,
            userId: connection.userId,
            accountId: transaction.account_id,
            amount: transaction.amount,
            date: new Date(transaction.date),
            name: transaction.name,
            merchantName: transaction.merchant_name,
            pending: transaction.pending,
            paymentChannel: transaction.payment_channel,
            category: transaction.category?.join(', '),
            categoryId: transaction.category_id,
          },
        })
      }

      // Process modified transactions
      for (const transaction of modified) {
        await fastify.db.plaidTransactions.update({
          where: {
            transactionId: transaction.transaction_id,
          },
          data: {
            amount: transaction.amount,
            date: new Date(transaction.date),
            name: transaction.name,
            merchantName: transaction.merchant_name,
            pending: transaction.pending,
            paymentChannel: transaction.payment_channel,
            category: transaction.category?.join(', '),
            categoryId: transaction.category_id,
          },
        })
      }

      // Process removed transactions
      for (const transaction of removed) {
        await fastify.db.plaidTransactions.delete({
          where: {
            transactionId: transaction.transaction_id,
          },
        })
      }

      // Update the cursor
      await fastify.db.plaidSyncCursor.upsert({
        where: {
          itemId,
        },
        create: {
          itemId,
          cursor: next_cursor,
        },
        update: {
          cursor: next_cursor,
        },
      })

      // If there are more transactions, continue syncing
      if (has_more) {
        await syncTransactionsForItem(itemId, accessToken)
      }

      return {
        status: 'success',
        added: added.length,
        modified: modified.length,
        removed: removed.length,
      }
    } catch (error) {
      fastify.log.error(`Error syncing transactions: ${error}`)
      throw error
    }
  }
}