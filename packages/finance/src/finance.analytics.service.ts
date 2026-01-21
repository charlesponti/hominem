import { z } from 'zod';

import type { QueryOptions } from './finance.types';

import { calculateAveragePerDay, calculateTimeSeriesTotals } from './analytics/analytics.utils';
import {
  findTopMerchants,
  summarizeByCategory,
  summarizeByMonth,
} from './analytics/transaction-analytics.service';

export const CategoryBreakdownSchema = z.object({
  category: z.string(),
  amount: z.number(),
  percentage: z.number(),
  transactionCount: z.number(),
});

export const getCategoryBreakdownInputSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const getCategoryBreakdownOutputSchema = z.object({
  breakdown: z.array(CategoryBreakdownSchema),
  totalSpending: z.number(),
  averagePerDay: z.number(),
});

export const getSpendingTimeSeriesInputSchema = z.object({
  from: z.string().optional().describe('Start date'),
  to: z.string().optional().describe('End date'),
});

export const getSpendingTimeSeriesOutputSchema = z.object({
  series: z.array(
    z.object({
      month: z.string(),
      count: z.number(),
      income: z.string(),
      expenses: z.string(),
      average: z.string(),
    }),
  ),
  total: z.number(),
  average: z.number(),
});

export const getTopMerchantsInputSchema = z.object({
  limit: z.number().optional().describe('Number of top merchants to return'),
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
});

export const getTopMerchantsOutputSchema = z.object({
  merchants: z.array(
    z.object({
      name: z.string(),
      totalSpent: z.number(),
      transactionCount: z.number(),
    }),
  ),
});

export async function getCategoryBreakdown(
  userId: string,
  input: z.infer<typeof getCategoryBreakdownInputSchema>,
) {
  const options: QueryOptions = { userId };
  if (input.from) options.from = input.from;
  if (input.to) options.to = input.to;
  if (input.category) options.category = input.category;
  if (input.limit) options.limit = input.limit;
  const breakdown = await summarizeByCategory(options);
  const totalSpending = breakdown.reduce((sum, cat) => sum + Number.parseFloat(cat.total), 0);
  const mappedBreakdown = breakdown.map((cat) => ({
    category: cat.category,
    amount: Number.parseFloat(cat.total),
    percentage: totalSpending > 0 ? (Number.parseFloat(cat.total) / totalSpending) * 100 : 0,
    transactionCount: cat.count,
  }));
  const averagePerDay = calculateAveragePerDay(totalSpending, input.from, input.to);
  return { breakdown: mappedBreakdown, totalSpending, averagePerDay };
}

export async function getSpendingTimeSeries(
  userId: string,
  input: z.infer<typeof getSpendingTimeSeriesInputSchema>,
) {
  const options: QueryOptions = { userId, from: input.from, to: input.to };
  const result = await summarizeByMonth(options);
  const { total, average } = calculateTimeSeriesTotals(result);
  return { series: result, total, average };
}

export async function getTopMerchants(
  userId: string,
  input: z.infer<typeof getTopMerchantsInputSchema>,
) {
  const options: QueryOptions = {
    userId,
    limit: input.limit || 5,
    from: input.from,
    to: input.to,
    account: input.account,
    category: input.category,
  };
  const result = await findTopMerchants(options);
  return {
    merchants: result.map((merchant) => ({
      name: merchant.merchant,
      totalSpent: Number.parseFloat(merchant.totalSpent),
      transactionCount: merchant.frequency,
    })),
  };
}
