import {
  calculateTransactions,
  generateTimeSeriesData,
  getCategoryBreakdown,
  getMonthlyStats,
  getTopMerchants,
} from '@hominem/finance-services';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

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
      }),
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
      });

      return result;
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
      }),
    )
    .query(async ({ input, ctx }) => getTopMerchants(ctx.userId, input)),

  // Category breakdown
  categoryBreakdown: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        category: z.string().optional(),
        limit: z.coerce.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => getCategoryBreakdown(ctx.userId, input)),

  // Calculate transactions
  calculate: protectedProcedure
    .input(
      z.object({
        from: z.string().optional().describe('Start date'),
        to: z.string().optional().describe('End date'),
        category: z.string().optional(),
        account: z.string().optional().describe('Account ID or name'),
        type: z.enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment']).optional(),
        calculationType: z.enum(['sum', 'average', 'count', 'stats']).optional(),
        descriptionLike: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return calculateTransactions({
        ...input,
        userId: ctx.userId,
      });
    }),

  // Monthly stats
  monthlyStats: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
      }),
    )
    .query(async ({ input, ctx }) => {
      return getMonthlyStats({ month: input.month, userId: ctx.userId });
    }),
});
