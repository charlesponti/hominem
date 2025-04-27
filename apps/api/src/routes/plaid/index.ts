import { db } from '@hominem/utils/db'
import {
  financeAccounts,
  financialInstitutions,
  plaidItems,
  transactions,
} from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import plaidTokenRoutes from './tokens.js'
import plaidTransactionRoutes from './transactions.js'

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
      const { userId } = request

      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      const accounts = await db
        .select({
          id: financeAccounts.id,
          name: financeAccounts.name,
          type: financeAccounts.type,
          balance: financeAccounts.balance,
          mask: financeAccounts.mask,
          subtype: financeAccounts.subtype,
          institutionId: financeAccounts.institutionId,
          plaidItemId: financeAccounts.plaidItemId,
          institutionName: financialInstitutions.name,
          institutionLogo: financialInstitutions.logo,
        })
        .from(financeAccounts)
        .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
        .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
        .where(eq(financeAccounts.userId, userId))

      return { accounts }
    } catch (error) {
      fastify.log.error(`Error fetching accounts: ${error}`)
      return reply.status(500).send({ error: 'Failed to fetch accounts' })
    }
  })

  // Get information about connected institutions
  fastify.get('/institutions', async (request, reply) => {
    try {
      const { userId } = request

      if (!userId) {
        return reply.status(401).send({ error: 'User not authenticated' })
      }

      const connections = await db
        .select({
          id: plaidItems.id,
          itemId: plaidItems.itemId,
          institutionId: plaidItems.institutionId,
          status: plaidItems.status,
          lastSyncedAt: plaidItems.lastSyncedAt,
          error: plaidItems.error,
          name: financialInstitutions.name,
          logo: financialInstitutions.logo,
          primaryColor: financialInstitutions.primaryColor,
          url: financialInstitutions.url,
        })
        .from(plaidItems)
        .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
        .where(eq(plaidItems.userId, userId))

      return {
        connections: connections.map((connection) => ({
          ...connection,
          institution: connection.name
            ? {
                id: connection.institutionId,
                name: connection.name,
                logo: connection.logo,
                primaryColor: connection.primaryColor,
                url: connection.url,
              }
            : null,
        })),
      }
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
        const { userId } = request

        if (!userId) {
          return reply.status(401).send({ error: 'User not authenticated' })
        }

        // Verify the connection belongs to the user
        const connection = await db
          .select()
          .from(plaidItems)
          .where(and(eq(plaidItems.itemId, itemId), eq(plaidItems.userId, userId)))
          .limit(1)

        if (!connection.length) {
          return reply.status(404).send({ error: 'Connection not found' })
        }

        const plaidItemId = connection[0].id

        // Find accounts associated with this item
        const accounts = await db
          .select({ id: financeAccounts.id })
          .from(financeAccounts)
          .where(eq(financeAccounts.plaidItemId, plaidItemId))

        const accountIds = accounts.map((account) => account.id)

        // Delete associated transactions
        if (accountIds.length > 0) {
          for (const accountId of accountIds) {
            await db.delete(transactions).where(eq(transactions.accountId, accountId))
          }
        }

        // Delete associated accounts
        await db.delete(financeAccounts).where(eq(financeAccounts.plaidItemId, plaidItemId))

        // Delete the plaid item
        await db.delete(plaidItems).where(eq(plaidItems.id, plaidItemId))

        return { status: 'success' }
      } catch (error) {
        fastify.log.error(`Error removing connection: ${error}`)
        return reply.status(500).send({ error: 'Failed to remove connection' })
      }
    },
  })
}
