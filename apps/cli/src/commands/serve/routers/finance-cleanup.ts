import { db } from '@ponti/utils/db'
import logger from '@ponti/utils/logger'
import { transactions } from '@ponti/utils/schema'
import { and, eq, sql } from 'drizzle-orm'
import { trpc as t } from '../trpc'

export const transactionsCleanupRouter = t.router({
  cleanupTransactions: t.procedure.mutation(async () => {
    try {
      const duplicateTransactions = await db
        .select({
          description: transactions.description,
          date: transactions.date,
          amount: transactions.amount,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .groupBy(transactions.description, transactions.date, transactions.amount)
        .having(sql`count(*) > 1`)

      if (duplicateTransactions.length === 0) {
        return { message: 'No duplicate records found' }
      }

      let totalDuplicatesRemoved = 0

      for (const duplicate of duplicateTransactions) {
        const { description, date, amount } = duplicate

        await db.delete(transactions).where(
          and(
            description ? eq(transactions.description, description) : undefined,
            eq(transactions.date, date),
            eq(transactions.amount, amount),
            description
              ? sql`id NOT IN (
                SELECT id FROM ${transactions}
                WHERE description = ${description}
                AND date = ${date}
                AND amount = ${amount}
                ORDER BY created_at ASC
                LIMIT 1
              )`
              : undefined
          )
        )

        totalDuplicatesRemoved += duplicate.count - 1
      }

      return {
        message: `Cleanup completed: Removed ${totalDuplicatesRemoved} duplicate transactions`,
      }
    } catch (error) {
      logger.error(error)
      throw new Error(
        `Error cleaning up transactions: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }),
})
