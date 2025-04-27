import { db } from '@hominem/utils/db'
import { FinancialAccountService } from '@hominem/utils/finance'
import { financeAccounts } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'

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

      // Create new account via service
      const newAccount = await FinancialAccountService.createAccount({
        userId,
        name: validated.name,
        type: validated.type,
        balance: validated.balance?.toString() || '0',
        institutionId: validated.institution || null,
        meta: null,
      })

      return newAccount
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

      // List accounts via service
      const accounts = await FinancialAccountService.listAccounts(userId)
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

      // Fetch via service
      const account = await FinancialAccountService.getAccountById(id, userId)
      if (!account) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      return account
    } catch (error) {
      return handleError(error as Error, reply)
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

      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(id, userId)
      if (!existing) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // If name is being changed, check if new name conflicts with existing account
      if (validated.name && validated.name !== existing.name) {
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

      // Update via service
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        ...validated,
        balance: validated.balance?.toString(),
        institutionId: validated.institution,
      })

      return updatedAccount
    } catch (error) {
      return handleError(error as Error, reply)
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

      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(id, userId)
      if (!existing) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // Delete via service
      await FinancialAccountService.deleteAccount(id, userId)

      return { success: true, message: 'Account deleted successfully' }
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })
}
