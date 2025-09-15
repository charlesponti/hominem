import { db } from '@hominem/data'
import { transactions } from '@hominem/data/schema'
import {
  buildWhereConditions,
  calculateTransactions,
  categoryBreakdownSchema,
  findTopMerchants,
  generateTimeSeriesData,
  summarizeByCategory,
} from '@hominem/utils/finance'
import { count, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../../procedures.js'

// Analytics tRPC router
export const analyzeRouter = router({
  // Spending time series
  spendingTimeSeries: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        account: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().optional(),
        groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
        includeStats: z.boolean().optional().default(false),
        compareToPrevious: z.boolean().optional().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      // Use the service to generate time series data
      const result = await generateTimeSeriesData({
        from: input.from,
        to: input.to,
        account: input.account,
        category: input.category,
        limit: input.limit,
        groupBy: input.groupBy,
        includeStats: input.includeStats,
        compareToPrevious: input.compareToPrevious,
        userId: ctx.userId,
      })

      return result
    }),

  // Top merchants
  topMerchants: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        account: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().optional().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const options = {
        userId: ctx.userId,
        from: input.from,
        to: input.to,
        account: input.account,
        category: input.category,
        limit: input.limit,
      }
      const result = await findTopMerchants(options)
      return result
    }),

  // Category breakdown
  categoryBreakdown: protectedProcedure
    .input(categoryBreakdownSchema)
    .query(async ({ input, ctx }) => {
      const result = await summarizeByCategory({
        ...input,
        userId: ctx.userId,
      })
      return result
    }),

  // Calculate transactions
  calculate: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        category: z.string().optional(),
        accounts: z.array(z.string()).optional(),
        type: z.enum(['income', 'expense']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await calculateTransactions({
        ...input,
        userId: ctx.userId,
      })

      return result
    }),

  // Monthly stats
  monthlyStats: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
      })
    )
    .query(async ({ input, ctx }) => {
      const { month } = input // Format: YYYY-MM

      // Calculate start and end dates for the month (inclusive start, exclusive end)
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(startDate.getMonth() + 1)

      // Use standardized condition building with month date range
      const monthFilter = buildWhereConditions({
        userId: ctx.userId,
        from: startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        to: endDate.toISOString().split('T')[0],
      })

      const totalsResult = await db
        .select({
          totalIncome:
            sql<number>`sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end)`.mapWith(
              Number
            ),
          totalExpenses:
            sql<number>`sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end)`.mapWith(
              Number
            ),
          transactionCount: count(),
        })
        .from(transactions)
        .where(monthFilter)

      const { totalIncome = 0, totalExpenses = 0, transactionCount = 0 } = totalsResult[0] ?? {}

      // 2. Calculate Spending by Category (only expenses)
      const categorySpendingFilter = buildWhereConditions({
        userId: ctx.userId,
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        type: 'expense',
      })

      const categorySpendingResult = await db
        .select({
          category: transactions.category,
          amount: sql<number>`sum(abs(${transactions.amount}::numeric))`.mapWith(Number),
        })
        .from(transactions)
        .where(categorySpendingFilter)
        .groupBy(transactions.category)
        .orderBy(desc(sql<number>`sum(abs(${transactions.amount}::numeric))`))

      const stats = {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        transactionCount,
        categorySpending: categorySpendingResult.map((c) => ({
          name: c.category,
          amount: c.amount,
        })),
      }

      return stats
    }),
})
