import { db } from '@hominem/utils/db'
import { FinancialAccountService, getFinancialInstitutions } from '@hominem/utils/finance'
import { financialInstitutions, plaidItems } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { protectedProcedure, router } from '../../trpc/index.js'

// Keep existing Hono route for backward compatibility
export const financeInstitutionsRoutes = new Hono()

// Get all financial institutions
financeInstitutionsRoutes.get('/', async (c) => {
  try {
    const institutions = await getFinancialInstitutions()
    return c.json(institutions)
  } catch (error) {
    console.error('Error fetching financial institutions:', error)
    return c.json({ error: 'Failed to fetch financial institutions' }, 500)
  }
})

// Export tRPC router
export const institutionsRouter = router({
  list: protectedProcedure.query(async () => {
    return await getFinancialInstitutions()
  }),
  link: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        institutionId: z.string().min(1, 'Institution ID is required'),
        plaidItemId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { accountId, institutionId, plaidItemId } = input

      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(accountId, ctx.userId)
      if (!existingAccount) {
        throw new Error('Account not found')
      }

      // Verify institution exists
      const institution = await db.query.financialInstitutions.findFirst({
        where: eq(financialInstitutions.id, institutionId),
      })

      if (!institution) {
        throw new Error('Institution not found')
      }

      // If plaidItemId provided, verify it exists and belongs to user
      if (plaidItemId) {
        const plaidItem = await db.query.plaidItems.findFirst({
          where: and(
            eq(plaidItems.id, plaidItemId),
            eq(plaidItems.userId, ctx.userId),
            eq(plaidItems.institutionId, institutionId)
          ),
        })

        if (!plaidItem) {
          throw new Error('Plaid item not found or does not belong to specified institution')
        }
      }

      // Update account to link with institution
      const updatedAccount = await FinancialAccountService.updateAccount(accountId, ctx.userId, {
        institutionId,
        plaidItemId: plaidItemId || null,
      })

      return {
        success: true,
        message: 'Account successfully linked to institution',
        account: updatedAccount,
      }
    }),

  unlink: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const { accountId } = input

      // Ensure account exists and belongs to user
      const existingAccount = await FinancialAccountService.getAccountById(accountId, ctx.userId)
      if (!existingAccount) {
        throw new Error('Account not found')
      }

      // Update account to unlink from institution
      const updatedAccount = await FinancialAccountService.updateAccount(accountId, ctx.userId, {
        institutionId: null,
        plaidItemId: null,
      })

      return {
        success: true,
        message: 'Account successfully unlinked from institution',
        account: updatedAccount,
      }
    }),
})
