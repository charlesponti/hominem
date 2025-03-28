import { db } from '@ponti/utils/db'
import logger from '@ponti/utils/logger'
import { financeAccounts, transactions } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { trpc as t } from '../trpc'

export const accountsRouter = t.router({
  // List accounts procedure
  listAccounts: t.procedure
    .input(
      z.object({
        activeOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input }) => {
      const accountsList = await db.select().from(financeAccounts)
      if (accountsList.length === 0) {
        return { message: 'No accounts found', accounts: [] }
      }
      return { message: `Found ${accountsList.length} accounts`, accounts: accountsList }
    }),

  // Update account details procedure
  updateAccount: t.procedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          type: z
            .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
            .optional(),
          institutionId: z.string().optional(),
          balance: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      // First check if the account exists
      const account = await db
        .select()
        .from(financeAccounts)
        .where(eq(financeAccounts.id, input.id))
        .limit(1)
      if (account.length === 0) {
        throw new Error(`Account with ID ${input.id} not found`)
      }

      await db
        .update(financeAccounts)
        .set({
          // Only update provided data
          name: input.data.name,
          type: input.data.type,
          institutionId: input.data.institutionId,
          balance: input.data.balance,
        })
        .where(eq(financeAccounts.id, input.id))

      return { message: `Account ${input.id} updated successfully` }
    }),

  // Change account procedure: update the account ID for transactions
  changeAccount: t.procedure
    .input(
      z.object({
        old: z.string(),
        new: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const oldTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.accountId, input.old))

      for (const transaction of oldTransactions) {
        await db.transaction(async (trx) => {
          await trx
            .update(transactions)
            .set({ accountId: input.new })
            .where(eq(transactions.id, transaction.id))
        })
      }

      logger.info(`Updated ${oldTransactions.length} transactions`)
      return { message: `Updated ${oldTransactions.length} transactions` }
    }),
})
