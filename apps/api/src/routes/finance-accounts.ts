import { db } from '@hominem/utils/db'
import { financeAccounts } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'

export async function financeAccountsRoutes(fastify: FastifyInstance) {
  // Schema definitions
  const createAccountSchema = z.object({
    name: z.string(),
    type: z.enum(['checking', 'savings', 'investment', 'credit']),
    balance: z.number().optional(),
    institution: z.string().optional(),
  })

  const updateAccountSchema = z.object({
    name: z.string().optional(),
    type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
    balance: z.number().optional(),
    institution: z.string().optional(),
  })

  const accountIdSchema = z.object({
    id: z.string(),
  })

  // Create account
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = createAccountSchema.parse(request.body)

      // Check if account with same name already exists for user
      const existingAccount = await db.query.financeAccounts.findFirst({
        where: and(eq(financeAccounts.userId, userId), eq(financeAccounts.name, validated.name)),
      })

      if (existingAccount) {
        reply.code(409)
        return { error: 'Account with this name already exists' }
      }

      // Create new account in database
      const newAccount = await db
        .insert(financeAccounts)
        .values({
          id: crypto.randomUUID(),
          userId,
          name: validated.name,
          type: validated.type,
          balance: validated.balance?.toString() || '0',
          institutionId: validated.institution || null,
          // createdAt: new Date(),
          // updatedAt: new Date(),
        })
        .returning()

      return newAccount[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // List accounts
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      // Fetch accounts from database for the user
      const accounts = await db.query.financeAccounts.findMany({
        where: eq(financeAccounts.userId, userId),
        orderBy: (accounts) => accounts.name,
      })

      return accounts
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get account by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }

      // Fetch account from database
      const account = await db.query.financeAccounts.findFirst({
        where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
      })

      if (!account) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      return account
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update account
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }
      const validated = updateAccountSchema.parse(request.body)

      // Check if account exists and belongs to user
      const existingAccount = await db.query.financeAccounts.findFirst({
        where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
      })

      if (!existingAccount) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // If name is being changed, check if new name conflicts with existing account
      if (validated.name && validated.name !== existingAccount.name) {
        const nameConflict = await db.query.financeAccounts.findFirst({
          where: and(
            eq(financeAccounts.userId, userId),
            eq(financeAccounts.name, validated.name),
            eq(financeAccounts.id, id)
          ),
        })

        if (nameConflict) {
          reply.code(409)
          return { error: 'Another account with this name already exists' }
        }
      }

      // Update account in database
      const updatedAccount = await db
        .update(financeAccounts)
        .set({
          ...validated,
          balance: validated.balance?.toString() || existingAccount.balance,
          // updatedAt: new Date(),s
        })
        .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))
        .returning()

      return updatedAccount[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete account
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }

      // Verify account exists and belongs to user
      const existingAccount = await db.query.financeAccounts.findFirst({
        where: and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)),
      })

      if (!existingAccount) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // Delete account
      await db
        .delete(financeAccounts)
        .where(and(eq(financeAccounts.id, id), eq(financeAccounts.userId, userId)))

      // Note: To handle cascade deletion of transactions, you would need to also
      // delete related transactions in the transactions table

      return { success: true, message: 'Account deleted successfully' }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
