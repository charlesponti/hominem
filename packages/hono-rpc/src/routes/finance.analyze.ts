import {
  generateTimeSeriesData,
  getTopMerchants,
  getCategoryBreakdown,
  calculateTransactions,
  getMonthlyStats,
} from '@hominem/finance-services';
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
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const result = await generateTimeSeriesData({
      ...input,
      userId,
    });

    return c.json<SpendingTimeSeriesOutput>(result as any, 200);
  })

  // POST /top-merchants - Top merchants
  .post('/top-merchants', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    account: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().optional().default(5),
  })), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const result = await getTopMerchants(userId, input);
    return c.json<TopMerchantsOutput>(result as any, 200);
  })

  // POST /category-breakdown - Category breakdown
  .post('/category-breakdown', zValidator('json', z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
    limit: z.coerce.number().optional(),
  })), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const result = await getCategoryBreakdown(userId, input);
    return c.json<CategoryBreakdownOutput>(result as any, 200);
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
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const result = await calculateTransactions({
      ...input,
      userId,
    });

    return c.json<CalculateTransactionsOutput>(result as any, 200);
  })

  // POST /monthly-stats - Monthly statistics
  .post('/monthly-stats', zValidator('json', z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  })), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const result = await getMonthlyStats({
      month: input.month,
      userId,
    });

    return c.json<MonthlyStatsOutput>(result as any, 200);
  });
