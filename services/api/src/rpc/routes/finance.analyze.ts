import {
  getTagBreakdownByContract,
  getMonthlyStatsByContract,
  getSpendingTimeSeriesByContract,
  getTopMerchantsByContract,
} from '@hominem/finance-services';
import type {
  TagBreakdownOutput,
  MonthlyStatsOutput,
  SpendingTimeSeriesOutput,
  TopMerchantsOutput,
} from '@hominem/rpc/types/finance/analytics.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const tagBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  tag: z.string().optional(),
  limit: z.union([z.number(), z.string()]).optional(),
});

const topMerchantsSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  tag: z.string().optional(),
  limit: z.union([z.number(), z.string()]).optional(),
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
  limit: z.union([z.number(), z.string()]).optional(),
  groupBy: z.enum(['month', 'week', 'day']).optional(),
  includeStats: z.boolean().optional(),
  compareToPrevious: z.boolean().optional(),
});

function toNumber(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getTagFilter(tag?: string): { tagIds?: string[]; tagNames?: string[] } {
  if (!tag) {
    return {};
  }
  if (isUuid(tag)) {
    return { tagIds: [tag] };
  }
  return { tagNames: [tag] };
}

export const analyzeRoutes = new Hono<AppContext>()
  .post('/tag-breakdown', authMiddleware, zValidator('json', tagBreakdownSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const limit = input.limit ? toNumber(input.limit) : 5;
    const tagFilter = getTagFilter(input.tag);
    const breakdownBase = await getTagBreakdownByContract({
      userId,
      ...(input.account ? { accountId: input.account } : {}),
      ...(input.from ? { dateFrom: input.from } : {}),
      ...(input.to ? { dateTo: input.to } : {}),
      ...tagFilter,
      limit,
      offset: 0,
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

    return c.json<TagBreakdownOutput>({
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
  .post('/top-merchants', authMiddleware, zValidator('json', topMerchantsSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const limit = input.limit ? Math.max(1, Math.floor(toNumber(input.limit))) : 10;
    const tagFilter = getTagFilter(input.tag);
    const merchants = await getTopMerchantsByContract({
      userId,
      ...(input.account ? { accountId: input.account } : {}),
      ...(input.from ? { dateFrom: input.from } : {}),
      ...(input.to ? { dateTo: input.to } : {}),
      ...tagFilter,
      limit,
      offset: 0,
    });

    return c.json<TopMerchantsOutput>({
      merchants,
    });
  })
  .post('/monthly-stats', authMiddleware, zValidator('json', monthlyStatsSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const monthly = await getMonthlyStatsByContract({
      userId,
      ...(input.month ? { month: input.month } : {}),
    });

    const monthlyStats: MonthlyStatsOutput = {
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

    return c.json<MonthlyStatsOutput>(monthlyStats);
  })
  .post(
    '/spending-time-series',
    authMiddleware,
    zValidator('json', spendingTimeSeriesSchema),
    async (c) => {
      const userId = c.get('userId')!;
      const input = c.req.valid('json');
      const limit = input.limit ? Math.max(1, Math.floor(toNumber(input.limit))) : 50;
      const tagFilter = getTagFilter(input.tag);
      const output = await getSpendingTimeSeriesByContract({
        userId,
        ...(input.account ? { accountId: input.account } : {}),
        ...(input.from ? { dateFrom: input.from } : {}),
        ...(input.to ? { dateTo: input.to } : {}),
        ...tagFilter,
        limit,
        ...(input.groupBy ? { groupBy: input.groupBy } : {}),
        ...(input.includeStats !== undefined ? { includeStats: input.includeStats } : {}),
      });

      return c.json<SpendingTimeSeriesOutput>(output);
    },
  );
