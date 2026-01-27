import * as z from 'zod';

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

export type GetCategoryBreakdownOutput = {
  breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  totalSpending: number;
  averagePerDay: number;
};

export async function getCategoryBreakdown(
  userId: string,
  input: z.infer<typeof getCategoryBreakdownInputSchema>,
): Promise<GetCategoryBreakdownOutput> {
  const breakdown = await summarizeByCategory({ userId, ...input });
  const totalSpending = breakdown.reduce((sum, cat) => sum + Number.parseFloat(cat.total), 0);
  const averagePerDay = calculateAveragePerDay(totalSpending, input.from, input.to);

  return {
    breakdown: breakdown.map((cat) => ({
      category: cat.category,
      amount: Number.parseFloat(cat.total),
      percentage: totalSpending > 0 ? (Number.parseFloat(cat.total) / totalSpending) * 100 : 0,
      transactionCount: cat.count,
    })),
    totalSpending,
    averagePerDay,
  };
}

export type GetSpendingTimeSeriesOutput = {
  series: Array<{
    month: string;
    count: number;
    income: string;
    expenses: string;
    average: string;
  }>;
  total: number;
  average: number;
};

export async function getSpendingTimeSeries(
  userId: string,
  input: z.infer<typeof getSpendingTimeSeriesInputSchema>,
): Promise<GetSpendingTimeSeriesOutput> {
  const result = await summarizeByMonth({ userId, ...input });
  const { total, average } = calculateTimeSeriesTotals(result);
  return { series: result, total, average };
}

export type GetTopMerchantsOutput = {
  merchants: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
  }>;
};

export async function getTopMerchants(
  userId: string,
  input: z.infer<typeof getTopMerchantsInputSchema>,
): Promise<GetTopMerchantsOutput> {
  const result = await findTopMerchants({ userId, limit: 5, ...input });
  return {
    merchants: result.map((m) => ({
      name: m.merchant,
      totalSpent: Number.parseFloat(m.totalSpent),
      transactionCount: m.frequency,
    })),
  };
}
