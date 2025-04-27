import { and, desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { db } from '@hominem/utils/db'
import { financeAccounts, plaidItems, transactions } from '@hominem/utils/schema'
import { plaidClient } from '../../services/plaid.js'

const itemIdParam = z.object({
  itemId: z.string(),
})

const webhookSchema = z
  .object({
    webhook_type: z.string(),
    webhook_code: z.string(),
    item_id: z.string(),
  })
  .passthrough()

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
        const { userId } = request

        if (!userId) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Get the connection to verify ownership
        const connections = await db
          .select()
          .from(plaidItems)
          .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))
          .limit(1)

        if (!connections.length) {
          return reply.status(404).send({ error: 'Connection not found' })
        }

        const connection = connections[0]

        // Sync the transactions
        const result = await syncTransactionsForItem(
          itemId,
          connection.accessToken,
          connection.userId
        )
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
        const { webhook_type, webhook_code, item_id } = request.body as z.infer<
          typeof webhookSchema
        >

        fastify.log.info(`Received webhook: ${webhook_type} - ${webhook_code} for item ${item_id}`)

        if (webhook_type === 'TRANSACTIONS' && webhook_code === 'DEFAULT_UPDATE') {
          // Get the connection to fetch the access token
          const connectionResult = await db
            .select()
            .from(plaidItems)
            .where(eq(plaidItems.itemId, item_id))
            .limit(1)

          if (!connectionResult.length) {
            fastify.log.error(`Connection not found for item_id: ${item_id}`)
            return reply.status(404).send({ error: 'Connection not found' })
          }

          const connection = connectionResult[0]

          // Sync the transactions
          await syncTransactionsForItem(item_id, connection.accessToken, connection.userId)
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
        const { userId } = request

        if (!userId) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        const userTransactions = await db
          .select({
            id: transactions.id,
            amount: transactions.amount,
            date: transactions.date,
            description: transactions.description,
            merchantName: transactions.merchantName,
            type: transactions.type,
            pending: transactions.pending,
            category: transactions.category,
            parentCategory: transactions.parentCategory,
            accountName: financeAccounts.name,
            accountMask: financeAccounts.mask,
          })
          .from(transactions)
          .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.date))

        return { transactions: userTransactions }
      } catch (error) {
        fastify.log.error(`Error fetching transactions: ${error}`)
        return reply.status(500).send({ error: 'Failed to fetch transactions' })
      }
    },
  })

  /**
   * Sync transactions for a specific item
   */
  async function syncTransactionsForItem(itemId: string, accessToken: string, userId: string) {
    try {
      // Get the cursor for the item if it exists
      const plaidItemResult = await db
        .select()
        .from(plaidItems)
        .where(eq(plaidItems.itemId, itemId))
        .limit(1)

      if (!plaidItemResult.length) {
        throw new Error(`Connection not found for item_id: ${itemId}`)
      }

      const plaidItem = plaidItemResult[0]
      const cursor = plaidItem.transactionsCursor

      // Initial transaction sync
      const transactionsResponse = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
      })

      const { added, modified, removed, next_cursor, has_more } = transactionsResponse.data

      // Process added transactions
      for (const transaction of added) {
        // Get the associated account
        const accounts = await db
          .select()
          .from(financeAccounts)
          .where(eq(financeAccounts.plaidAccountId, transaction.account_id))
          .limit(1)

        if (!accounts.length) {
          fastify.log.error(`Account not found for account_id: ${transaction.account_id}`)
          continue
        }

        const account = accounts[0]

        // Map Plaid transaction to our schema
        await db.insert(transactions).values({
          amount: transaction.amount.toFixed(2),
          date: new Date(transaction.date),
          description: transaction.name,
          merchantName: transaction.merchant_name || null,
          accountId: account.id,
          userId,
          type: transaction.amount > 0 ? 'income' : 'expense',
          plaidTransactionId: transaction.transaction_id,
          pending: transaction.pending,
          paymentChannel: transaction.payment_channel,
          category: transaction.category?.[transaction.category.length - 1] || null,
          parentCategory: transaction.category?.[0] || null,
          source: 'plaid',
          accountMask: account.mask || null,
          location: transaction.location ? JSON.stringify(transaction.location) : null,
        })
      }

      // Process modified transactions
      for (const transaction of modified) {
        // Check if transaction exists
        const existingTxs = await db
          .select()
          .from(transactions)
          .where(eq(transactions.plaidTransactionId, transaction.transaction_id))
          .limit(1)

        if (!existingTxs.length) {
          fastify.log.error(`Transaction not found for update: ${transaction.transaction_id}`)
          continue
        }

        // Update the transaction
        await db
          .update(transactions)
          .set({
            amount: transaction.amount.toFixed(2),
            date: new Date(transaction.date),
            description: transaction.name,
            merchantName: transaction.merchant_name || null,
            pending: transaction.pending,
            paymentChannel: transaction.payment_channel,
            category: transaction.category?.[transaction.category.length - 1] || null,
            parentCategory: transaction.category?.[0] || null,
            location: transaction.location ? JSON.stringify(transaction.location) : null,
          })
          .where(eq(transactions.plaidTransactionId, transaction.transaction_id))
      }

      // Process removed transactions
      for (const transaction of removed) {
        if (transaction.transaction_id) {
          await db
            .delete(transactions)
            .where(eq(transactions.plaidTransactionId, transaction.transaction_id))
        }
      }

      // Update the cursor
      await db
        .update(plaidItems)
        .set({
          transactionsCursor: next_cursor,
          lastSyncedAt: new Date(),
        })
        .where(eq(plaidItems.itemId, itemId))

      // If there are more transactions, continue syncing
      if (has_more) {
        await syncTransactionsForItem(itemId, accessToken, userId)
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
