import {
  calculateTransactions,
  categoryBreakdownSchema,
  findTopMerchants,
  generateTimeSeriesData,
  getMonthlyStats,
  summarizeByCategory,
} from '@hominem/data/finance'
import { z } from 'zod'
import { protectedProcedure, router } from '../../procedures'

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
      return getMonthlyStats({ month: input.month, userId: ctx.userId })
    }),
})
