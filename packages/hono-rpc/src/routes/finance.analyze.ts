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

/**
 * Finance Analytics Routes
 *
 * Handles all analytics and reporting operations:
 * - POST /spending-time-series - Time series data for spending
 * - POST /top-merchants - Top merchants by spending
 * - POST /category-breakdown - Spending breakdown by category
 * - POST /calculate - Calculate transaction stats
 * - POST /monthly-stats - Monthly statistics
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const spendingTimeSeriesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional(),
  groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
  includeStats: z.boolean().optional().default(false),
  compareToPrevious: z.boolean().optional().default(false),
});

const topMerchantsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional().default(5),
});

const categoryBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().optional(),
});

const calculateTransactionsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  type: z.enum(['income', 'expense', 'credit', 'debit', 'transfer', 'investment']).optional(),
  calculationType: z.enum(['sum', 'average', 'count', 'stats']).optional(),
  descriptionLike: z.string().optional(),
});

const monthlyStatsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

// ============================================================================
// Routes
// ============================================================================

export const analyzeRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /spending-time-series - Time series data
  .post('/spending-time-series', zValidator('json', spendingTimeSeriesSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await generateTimeSeriesData({
        ...input,
        userId,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error generating time series:', error);
      return c.json({ error: 'Failed to generate time series' }, 500);
    }
  })

  // POST /top-merchants - Top merchants
  .post('/top-merchants', zValidator('json', topMerchantsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getTopMerchants(userId, input);
      return c.json(result);
    } catch (error) {
      console.error('Error getting top merchants:', error);
      return c.json({ error: 'Failed to get top merchants' }, 500);
    }
  })

  // POST /category-breakdown - Category breakdown
  .post('/category-breakdown', zValidator('json', categoryBreakdownSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getCategoryBreakdown(userId, input);
      return c.json(result);
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return c.json({ error: 'Failed to get category breakdown' }, 500);
    }
  })

  // POST /calculate - Calculate transactions
  .post('/calculate', zValidator('json', calculateTransactionsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await calculateTransactions({
        ...input,
        userId,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error calculating transactions:', error);
      return c.json({ error: 'Failed to calculate transactions' }, 500);
    }
  })

  // POST /monthly-stats - Monthly statistics
  .post('/monthly-stats', zValidator('json', monthlyStatsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getMonthlyStats({
        month: input.month,
        userId,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      return c.json({ error: 'Failed to get monthly stats' }, 500);
    }
  });
