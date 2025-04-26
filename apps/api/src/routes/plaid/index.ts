import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import plaidTokenRoutes from './tokens'
import plaidTransactionRoutes from './transactions'

const itemIdParam = z.object({
  itemId: z.string(),
})

/**
 * Register all Plaid-related routes
 */
export default async function plaidRoutes(fastify: FastifyInstance) {
  // Register the token routes with prefix
  fastify.register(plaidTokenRoutes, { prefix: '/tokens' })

  // Register the transactions routes with prefix
  fastify.register(plaidTransactionRoutes, { prefix: '/transactions' })

  // Get information about connected bank accounts
  fastify.get('/accounts', async (request, reply) => {
    try {
      const { user } = request.session

      if (!user) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      const accounts = await fastify.db.plaidAccounts.findMany({
        where: {
          userId: user.id,
        },
        include: {
          item: {
            select: {
              institutionName: true,
            },
          },
        },
      })

      return { accounts }
    } catch (error) {
      fastify.log.error(`Error fetching accounts: ${error}`)
      return reply.status(500).send({ error: 'Failed to fetch accounts' })
    }
  })

  // Get information about connected institutions
  fastify.get('/institutions', async (request, reply) => {
    try {
      const { user } = request.session

      if (!user) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      const connections = await fastify.db.plaidConnections.findMany({
        where: {
          userId: user.id,
        },
        include: {
          institution: true,
        },
      })

      return { connections }
    } catch (error) {
      fastify.log.error(`Error fetching institutions: ${error}`)
      return reply.status(500).send({ error: 'Failed to fetch institutions' })
    }
  })

  // Remove a Plaid connection
  fastify.delete('/connections/:itemId', {
    schema: {
      params: itemIdParam,
    },
    handler: async (request, reply) => {
      try {
        const { itemId } = request.params as z.infer<typeof itemIdParam>
        const { user } = request.session

        if (!user) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Verify the connection belongs to the user
        const connection = await fastify.db.plaidConnections.findFirst({
          where: {
            itemId,
            userId: user.id,
          },
        })

        if (!connection) {
          return reply.status(404).send({ error: 'Connection not found' })
        }

        // Delete associated data
        await fastify.db.plaidTransactions.deleteMany({
          where: {
            accountId: {
              in: await fastify.db.plaidAccounts
                .findMany({
                  where: { itemId },
                  select: { accountId: true },
                })
                .then((accounts) => accounts.map((a) => a.accountId)),
            },
          },
        })

        await fastify.db.plaidAccounts.deleteMany({
          where: { itemId },
        })

        await fastify.db.plaidSyncCursor.deleteMany({
          where: { itemId },
        })

        await fastify.db.plaidConnections.delete({
          where: { itemId },
        })

        return { status: 'success' }
      } catch (error) {
        fastify.log.error(`Error removing connection: ${error}`)
        return reply.status(500).send({ error: 'Failed to remove connection' })
      }
    },
  })
}
