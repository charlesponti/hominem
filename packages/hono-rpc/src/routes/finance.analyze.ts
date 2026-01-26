import {
  generateTimeSeriesData,
  getTopMerchants,
  getCategoryBreakdown,
  calculateTransactions,
  getMonthlyStats,
} from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  type SpendingTimeSeriesOutput,
  type TopMerchantsOutput,
  type CategoryBreakdownOutput,
  type CalculateTransactionsOutput,
  type MonthlyStatsOutput,
} from '../types/finance.types';

/**
 * Finance Analytics Routes
 *
 * Handles all analytics and reporting operations using the new API contract pattern.
 */
export const analyzeRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /spending-time-series - Time series data
  .post('/spending-time-series', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    account: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().optional(),
    groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
    includeStats: z.boolean().optional().default(false),
    compareToPrevious: z.boolean().optional().default(false),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await generateTimeSeriesData({
        ...input,
        userId,
      });

      return c.json<SpendingTimeSeriesOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<SpendingTimeSeriesOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error generating time series:', err);
      return c.json<SpendingTimeSeriesOutput>(error('INTERNAL_ERROR', 'Failed to generate time series'), 500);
    }
  })

  // POST /top-merchants - Top merchants
  .post('/top-merchants', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    account: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().optional().default(5),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await getTopMerchants(userId, input);
      return c.json<TopMerchantsOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<TopMerchantsOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting top merchants:', err);
      return c.json<TopMerchantsOutput>(error('INTERNAL_ERROR', 'Failed to get top merchants'), 500);
    }
  })

  // POST /category-breakdown - Category breakdown
  .post('/category-breakdown', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
    limit: z.coerce.number().optional(),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await getCategoryBreakdown(userId, input);
      return c.json<CategoryBreakdownOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<CategoryBreakdownOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting category breakdown:', err);
      return c.json<CategoryBreakdownOutput>(error('INTERNAL_ERROR', 'Failed to get category breakdown'), 500);
    }
  })

  // POST /calculate - Calculate transactions
  .post('/calculate', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
    account: z.string().optional(),
    type: z.enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment']).optional(),
    calculationType: z.enum(['sum', 'average', 'count', 'stats']).optional(),
    descriptionLike: z.string().optional(),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await calculateTransactions({
        ...input,
        userId,
      });

      return c.json<CalculateTransactionsOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<CalculateTransactionsOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error calculating transactions:', err);
      return c.json<CalculateTransactionsOutput>(error('INTERNAL_ERROR', 'Failed to calculate transactions'), 500);
    }
  })

  // POST /monthly-stats - Monthly statistics
  .post('/monthly-stats', zValidator('json', z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await getMonthlyStats({
        month: input.month,
        userId,
      });

      return c.json<MonthlyStatsOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<MonthlyStatsOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting monthly stats:', err);
      return c.json<MonthlyStatsOutput>(error('INTERNAL_ERROR', 'Failed to get monthly stats'), 500);
    }
  });
