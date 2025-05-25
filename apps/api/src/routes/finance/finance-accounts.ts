import { db } from '@hominem/utils/db'
import { FinancialAccountService } from '@hominem/utils/finance'
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors.js'
import { verifyAuth } from '../../middleware/auth.js'

export async function financeAccountsRoutes(fastify: FastifyInstance) {
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
      return handleError(error as Error, reply)
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
      return handleError(error as Error, reply)
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

  // Link an account to a Plaid institution
  fastify.post('/:id/link-institution', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }
      const linkSchema = z.object({
        institutionId: z.string().min(1, 'Institution ID is required'),
        plaidItemId: z.string().optional(),
      })

      const validated = linkSchema.parse(request.body)

      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(id, userId)
      if (!existingAccount) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // Verify institution exists
      const institution = await db.query.financialInstitutions.findFirst({
        where: eq(financialInstitutions.id, validated.institutionId),
      })

      if (!institution) {
        reply.code(404)
        return { error: 'Institution not found' }
      }

      // If plaidItemId provided, verify it exists and belongs to user
      if (validated.plaidItemId) {
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(
            eq(plaidItems.id, validated.plaidItemId),
            eq(plaidItems.userId, userId),
            eq(plaidItems.institutionId, validated.institutionId)
          ),
        })

        if (!plaidItem) {
          reply.code(404)
          return { error: 'Plaid item not found or does not belong to specified institution' }
        }
      }

      // Update account to link with institution
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        institutionId: validated.institutionId,
        plaidItemId: validated.plaidItemId || null,
      })

      return {
        success: true,
        message: 'Account successfully linked to institution',
        account: updatedAccount,
      }
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Unlink an account from its institution
  fastify.post('/:id/unlink-institution', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { id } = request.params as { id: string }

      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(id, userId)
      if (!existingAccount) {
        reply.code(404)
        return { error: 'Account not found' }
      }

      // Update account to unlink from institution
      const updatedAccount = await FinancialAccountService.updateAccount(id, userId, {
        institutionId: null,
        plaidItemId: null,
      })

      return {
        success: true,
        message: 'Account successfully unlinked from institution',
        account: updatedAccount,
      }
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Get all accounts with comprehensive data (unified endpoint)
  fastify.get('/all', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      // Get all finance accounts with institution and Plaid connection info
      const allAccounts = await db
        .select({
          id: financeAccounts.id,
          name: financeAccounts.name,
          type: financeAccounts.type,
          balance: financeAccounts.balance,
          mask: financeAccounts.mask,
          subtype: financeAccounts.subtype,
          institutionId: financeAccounts.institutionId,
          plaidItemId: financeAccounts.plaidItemId,
          createdAt: financeAccounts.createdAt,
          updatedAt: financeAccounts.updatedAt,
          // Institution info from joined table
          institutionName: financialInstitutions.name,
          institutionLogo: financialInstitutions.logo,
          // Plaid connection info
          isPlaidConnected: sql<boolean>`${financeAccounts.plaidItemId} IS NOT NULL`,
          // Plaid connection status info
          plaidItemStatus: plaidItems.status,
          plaidItemError: plaidItems.error,
          plaidLastSyncedAt: plaidItems.lastSyncedAt,
          plaidItemInternalId: plaidItems.id,
          // Get institution ID and name from Plaid item for connections
          plaidInstitutionId: plaidItems.institutionId,
          plaidInstitutionName: financialInstitutions.name,
        })
        .from(financeAccounts)
        .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
        .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
        .where(eq(financeAccounts.userId, userId))

      // Get recent transactions for each account using the existing service method
      const accountsWithTransactions = await Promise.all(
        allAccounts.map(async (account) => {
          // Use the existing service method to get recent transactions
          const accountWithTransactions =
            await FinancialAccountService.listAccountsWithRecentTransactions(userId, 5)
          const accountData = accountWithTransactions.find((acc) => acc.id === account.id)

          return {
            ...account,
            transactions: accountData?.transactions || [],
          }
        })
      )

      // Get Plaid connections separately starting from plaidItems table
      // This ensures we capture all Plaid connections, even those without corresponding finance accounts
      const plaidConnections = await db
        .select({
          id: plaidItems.id,
          itemId: plaidItems.itemId,
          institutionId: plaidItems.institutionId,
          institutionName: financialInstitutions.name,
          status: plaidItems.status,
          lastSyncedAt: plaidItems.lastSyncedAt,
          error: plaidItems.error,
          createdAt: plaidItems.createdAt,
        })
        .from(plaidItems)
        .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
        .where(eq(plaidItems.userId, userId))

      const uniqueConnections = plaidConnections.map((connection) => ({
        id: connection.id,
        itemId: connection.itemId,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName || 'Unknown Institution',
        status: connection.status,
        lastSyncedAt: connection.lastSyncedAt,
        error: connection.error,
        createdAt: connection.createdAt,
      }))

      return {
        accounts: accountsWithTransactions,
        connections: uniqueConnections,
      }
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })
}
