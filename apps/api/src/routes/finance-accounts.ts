import type { FinanceAccount } from '@ponti/utils/schema'
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

      //TODO: Implement account creation in database
      //TODO: Validate that account with same name doesn't already exist for user
      //TODO: Return created account from database
      const newAccount = {
        id: crypto.randomUUID(),
        ...validated,
        userId,
        createdAt: new Date(),
      }

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

      //!TODO Fetch accounts logic goes here
      //TODO: Implement database query to fetch all accounts for userId
      //TODO: Add pagination support
      //TODO: Add filtering by account type
      const accounts: FinanceAccount[] = []

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

      // Fetch account logic goes here
      //TODO: Implement database query to fetch account by id
      //TODO: Verify account belongs to userId
      const account = null

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

      // Update account logic goes here
      //TODO: Verify account exists and belongs to userId
      //TODO: Implement database update for account
      //TODO: Return updated account from database
      const updatedAccount = {
        id,
        ...validated,
        userId,
        updatedAt: new Date(),
      }

      return updatedAccount
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

      // Delete account logic goes here
      //TODO: Verify account exists and belongs to userId
      //TODO: Implement database deletion
      //TODO: Handle cascading deletions if needed (e.g., related transactions)

      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
