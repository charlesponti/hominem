import {
  getTagBreakdownByContract,
  getMonthlyStatsByContract,
  getSpendingTimeSeriesByContract,
  getTopMerchantsByContract,
} from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const tagBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().optional(),
});

const topMerchantsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().optional(),
});

const monthlyStatsSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

const spendingTimeSeriesSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().optional(),
  groupBy: z.enum(['month', 'week', 'day']).optional(),
  includeStats: z.coerce.boolean().optional(),
  compareToPrevious: z.coerce.boolean().optional(),
});

function toCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getTagFilter(tag?: string): { tag_ids?: string[]; tag_names?: string[] } {
  if (!tag) {
    return {};
  }
  if (isUuid(tag)) {
    return { tag_ids: [tag] };
  }
  return { tag_names: [tag] };
}

export const analyzeRoutes = new Hono<AppContext>()
  .get('/tag-breakdown', authMiddleware, zValidator('query', tagBreakdownSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const limit = input.limit ?? 5;
    const tagFilter = getTagFilter(input.tag);
    const breakdownBase = await getTagBreakdownByContract({
      userId: userId,
      ...(input.account ? { account_id: input.account } : {}),
      ...(input.from ? { date_from: input.from } : {}),
      ...(input.to ? { date_to: input.to } : {}),
      ...tagFilter,
      limit,
    });
    const totalSpending = breakdownBase.reduce((sum, item) => sum + item.amount, 0);
    const fromDate = input.from ? new Date(input.from) : null;
    const toDate = input.to ? new Date(input.to) : null;
    const daySpan =
      fromDate && toDate
        ? Math.max(
            1,
            Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
          )
        : 1;

    return c.json({
      breakdown: breakdownBase.map((item) => ({
        tag: item.tag,
        amount: item.amount,
        percentage: totalSpending === 0 ? 0 : (item.amount / totalSpending) * 100,
        transactionCount: item.transactionCount,
      })),
      totalSpending,
      averagePerDay: totalSpending / daySpan,
    });
  })
  .get('/top-merchants', authMiddleware, zValidator('query', topMerchantsSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const limit = input.limit ? Math.max(1, Math.floor(input.limit)) : 10;
    const tagFilter = getTagFilter(input.tag);
    const merchants = await getTopMerchantsByContract({
      userId: userId,
      ...(input.account ? { account_id: input.account } : {}),
      ...(input.from ? { date_from: input.from } : {}),
      ...(input.to ? { date_to: input.to } : {}),
      ...tagFilter,
      limit,
    });

    return c.json({
      merchants,
    });
  })
  .get('/monthly-stats', authMiddleware, zValidator('query', monthlyStatsSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const monthly = await getMonthlyStatsByContract({
      userId: userId,
      ...(input.month ? { month: input.month } : {}),
    });

    const monthlyStats = {
      month: monthly.month,
      income: monthly.income,
      expenses: monthly.expenses,
      net: monthly.net,
      transactionCount: monthly.transactionCount,
      averageTransaction: monthly.averageTransaction,
      topTag: monthly.topTag,
      topMerchant: monthly.topMerchant,
      formattedIncome: toCurrency(monthly.income),
      formattedExpenses: toCurrency(monthly.expenses),
      formattedNet: toCurrency(monthly.net),
      formattedAverage: toCurrency(monthly.averageTransaction),
      totalIncome: monthly.income,
      totalExpenses: monthly.expenses,
      netIncome: monthly.net,
      tagSpending: monthly.tagSpending,
      ...(monthly.startDate ? { startDate: monthly.startDate } : {}),
      ...(monthly.endDate ? { endDate: monthly.endDate } : {}),
    };

    return c.json(monthlyStats);
  })
  .get(
    '/spending-time-series',
    authMiddleware,
    zValidator('query', spendingTimeSeriesSchema),
    async (c) => {
      const userId = c.get('auth')!.userId;
      const input = c.req.valid('query');
      const limit = input.limit ? Math.max(1, Math.floor(input.limit)) : 50;
      const tagFilter = getTagFilter(input.tag);
      const output = await getSpendingTimeSeriesByContract({
        userId: userId,
        ...(input.account ? { account_id: input.account } : {}),
        ...(input.from ? { date_from: input.from } : {}),
        ...(input.to ? { date_to: input.to } : {}),
        ...tagFilter,
        limit,
        ...(input.groupBy ? { groupBy: input.groupBy } : {}),
        ...(input.includeStats !== undefined ? { includeStats: input.includeStats } : {}),
      });

      return c.json(output);
    },
  );
