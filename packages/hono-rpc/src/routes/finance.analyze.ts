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
  type SpendingDataPointBase,
  type SpendingDataPointWithTrend,
  type SpendingDataPoint,
  type TimeSeriesStats,
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

    // Transform service types to API contract types with explicit type assertions
    const transformedData: SpendingDataPoint[] = result.data.map(point => {
      const base: SpendingDataPointBase = {
        date: point.date,
        amount: point.amount,
        expenses: point.expenses,
        income: point.income,
        count: point.count,
        average: point.average,
        formattedAmount: point.formattedAmount,
        formattedIncome: point.formattedIncome,
        formattedExpenses: point.formattedExpenses,
      };

      // Only add trend if it exists (exactOptionalPropertyTypes requires this)
      if (point.trend) {
        const withTrend: SpendingDataPointWithTrend = {
          ...base,
          trend: {
            raw: point.trend.raw,
            formatted: point.trend.percentChange ?? '', // Use percentChange as formatted
            direction: point.trend.direction === 'up' || point.trend.direction === 'down' ? point.trend.direction : 'flat',
            percentChange: point.trend.percentChange,
            previousAmount: point.trend.previousAmount,
            formattedPreviousAmount: point.trend.formattedPreviousAmount,
            percentChangeExpenses: point.trend.percentChangeExpenses,
            rawExpenses: point.trend.rawExpenses,
            previousExpenses: point.trend.previousExpenses,
            formattedPreviousExpenses: point.trend.formattedPreviousExpenses,
            directionExpenses: point.trend.directionExpenses,
          },
        };
        return withTrend;
      }

      return base;
    });

    const transformedStats: TimeSeriesStats | null = result.stats ? {
      total: result.stats.total,
      average: result.stats.average,
      min: result.stats.min,
      max: result.stats.max,
      trend: 'stable', // Would need historical data to determine
      changePercentage: 0, // Would need historical data to calculate
      periodCovered: result.stats.periodCovered,
      totalIncome: result.stats.totalIncome,
      totalExpenses: result.stats.totalExpenses,
      averageIncome: result.stats.averageIncome,
      averageExpenses: result.stats.averageExpenses,
      count: result.stats.count,
    } : null;

    return c.json<SpendingTimeSeriesOutput>({
      data: transformedData,
      stats: transformedStats,
    }, 200);
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
    return c.json<TopMerchantsOutput>(result, 200);
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
    return c.json<CategoryBreakdownOutput>(result, 200);
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

    // Transform service result to API contract format
    let output: CalculateTransactionsOutput;
    if ('calculationType' in result) {
      // TransactionAggregation format
      output = {
        [result.calculationType]: result.value,
      };
    } else {
      // TransactionStats format
      output = {
        count: result.count,
        formattedSum: result.total,
        formattedAverage: result.average,
        stats: {
          min: Number.parseFloat(result.minimum.replace(/[$,]/g, '')),
          max: Number.parseFloat(result.maximum.replace(/[$,]/g, '')),
          mean: Number.parseFloat(result.average.replace(/[$,]/g, '')),
          median: 0, // Not provided by service
          stdDev: 0, // Not provided by service
        },
      };
    }

    return c.json<CalculateTransactionsOutput>(output, 200);
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

    // Transform service result to API contract format
    const averageTransaction = result.transactionCount > 0
      ? (result.totalIncome + result.totalExpenses) / result.transactionCount
      : 0;

    const topCategory = result.categorySpending[0]?.name ?? '';
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const output: MonthlyStatsOutput = {
      month: result.month,
      income: result.totalIncome,
      expenses: result.totalExpenses,
      net: result.netIncome,
      transactionCount: result.transactionCount,
      averageTransaction,
      topCategory,
      topMerchant: '', // Not provided by service
      formattedIncome: formatCurrency(result.totalIncome),
      formattedExpenses: formatCurrency(result.totalExpenses),
      formattedNet: formatCurrency(result.netIncome),
      formattedAverage: formatCurrency(averageTransaction),
      totalIncome: result.totalIncome,
      totalExpenses: result.totalExpenses,
      netIncome: result.netIncome,
      categorySpending: result.categorySpending,
      startDate: result.startDate,
      endDate: result.endDate,
    };

    return c.json<MonthlyStatsOutput>(output, 200);
  });
