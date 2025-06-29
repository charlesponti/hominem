import { db } from '@hominem/utils/db'
import { FinancialAccountService } from '@hominem/utils/finance'
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../../trpc/index.js'

export const accountsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx }) => {
      return await FinancialAccountService.listAccounts(ctx.userId)
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return await FinancialAccountService.getAccountById(input.id, ctx.userId)
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        type: z.enum(['checking', 'savings', 'investment', 'credit']),
        balance: z.number().optional(),
        institution: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if account with same name already exists for user
      const existingAccount = await db.query.financeAccounts.findFirst({
        where: and(eq(financeAccounts.userId, ctx.userId), eq(financeAccounts.name, input.name)),
      })

      if (existingAccount) {
        throw new Error('Account with this name already exists')
      }

      return await FinancialAccountService.createAccount({
        userId: ctx.userId,
        name: input.name,
        type: input.type,
        balance: input.balance?.toString() || '0',
        institutionId: input.institution || null,
        meta: null,
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
        balance: z.number().optional(),
        institution: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input

      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(id, ctx.userId)
      if (!existing) {
        throw new Error('Account not found')
      }

      // If name is being changed, check if new name conflicts with existing account
      if (updates.name && updates.name !== existing.name) {
        const nameConflict = await db.query.financeAccounts.findFirst({
          where: and(
            eq(financeAccounts.userId, ctx.userId),
            eq(financeAccounts.name, updates.name),
            eq(financeAccounts.id, id)
          ),
        })

        if (nameConflict) {
          throw new Error('Another account with this name already exists')
        }
      }

      return await FinancialAccountService.updateAccount(id, ctx.userId, {
        ...updates,
        balance: updates.balance?.toString(),
        institutionId: updates.institution,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Ensure exists
      const existing = await FinancialAccountService.getAccountById(input.id, ctx.userId)
      if (!existing) {
        throw new Error('Account not found')
      }

      await FinancialAccountService.deleteAccount(input.id, ctx.userId)
      return { success: true, message: 'Account deleted successfully' }
    }),
  all: protectedProcedure.query(async ({ ctx }) => {
    // Get all finance accounts with institution and Plaid connection info
    const allAccounts = await db
      .select({
        // Core FinanceAccount fields
        id: financeAccounts.id,
        userId: financeAccounts.userId,
        name: financeAccounts.name,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        interestRate: financeAccounts.interestRate,
        minimumPayment: financeAccounts.minimumPayment,
        institutionId: financeAccounts.institutionId,
        plaidAccountId: financeAccounts.plaidAccountId,
        plaidItemId: financeAccounts.plaidItemId,
        mask: financeAccounts.mask,
        isoCurrencyCode: financeAccounts.isoCurrencyCode,
        subtype: financeAccounts.subtype,
        officialName: financeAccounts.officialName,
        limit: financeAccounts.limit,
        meta: financeAccounts.meta,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
        // Additional Plaid connection info
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>`${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidItemStatus: plaidItems.status,
        plaidItemError: plaidItems.error,
        plaidLastSyncedAt: plaidItems.lastSyncedAt,
        plaidItemInternalId: plaidItems.id,
        plaidInstitutionId: plaidItems.institutionId,
        plaidInstitutionName: financialInstitutions.name,
      })
      .from(financeAccounts)
      .leftJoin(plaidItems, eq(financeAccounts.plaidItemId, plaidItems.id))
      .leftJoin(financialInstitutions, eq(plaidItems.institutionId, financialInstitutions.id))
      .where(eq(financeAccounts.userId, ctx.userId))

    // Get recent transactions for each account using the existing service method
    const accountsWithTransactions = await Promise.all(
      allAccounts.map(async (account) => {
        // Use the existing service method to get recent transactions
        const accountWithTransactions =
          await FinancialAccountService.listAccountsWithRecentTransactions(ctx.userId, 5)
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
      .where(eq(plaidItems.userId, ctx.userId))

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
  }),
})
