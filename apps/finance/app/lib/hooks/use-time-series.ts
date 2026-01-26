import type { SpendingTimeSeriesOutput } from '@hominem/hono-rpc/types/finance.types';

import { format } from 'date-fns';

import { useHonoQuery } from '../hono';

interface TimeSeriesParams {
  dateFrom?: Date;
  dateTo?: Date;
  account?: string;
  category?: string;
  includeStats?: boolean;
  compareToPrevious?: boolean;
  groupBy?: 'month' | 'week' | 'day';
  enabled?: boolean;
}

/**
 * Custom hook to fetch and manage time series data using Hono RPC
 */
export function useTimeSeriesData({
  dateFrom,
  dateTo,
  account,
  category,
  includeStats = true,
  compareToPrevious = true,
  groupBy = 'month',
  enabled = true,
}: TimeSeriesParams) {
  const query = useHonoQuery<SpendingTimeSeriesOutput>(
    [
      'finance',
      'analyze',
      'spending-time-series',
      {
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
        account,
        category,
        includeStats,
        compareToPrevious,
        groupBy,
      },
    ],
    async (client) => {
      const res = await client.api.finance.analyze['spending-time-series'].$post({
        json: {
          from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
          to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
          account: account && account !== 'all' ? account : undefined,
          category,
          includeStats,
          compareToPrevious,
          groupBy,
        },
      });
      return res.json() as Promise<SpendingTimeSeriesOutput>;
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2, // Only retry 2 times before giving up
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: false, // Don't refetch when network reconnects
    },
  );

  // Helper to format date labels based on grouping
  const formatDateLabel = (dateStr: string) => {
    if (groupBy === 'month') {
      // Convert YYYY-MM to MMM YYYY
      const [year, month] = dateStr.split('-');
      return new Date(
        Number.parseInt(year, 10),
        Number.parseInt(month, 10) - 1,
        1,
      ).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  };

  // Format data for charts
  const chartData = query.data?.data.map((item) => ({
    name: formatDateLabel(item.date),
    Spending: Math.abs(item.expenses || 0),
    Income: Math.abs(item.income || 0),
    Count: item.count,
    Average: Math.abs(item.average || 0),
    ...(item.trend ? { TrendChange: Number.parseFloat(item.trend.raw) } : {}),
  }));

  return {
    ...query,
    chartData,
    formatDateLabel,
  };
}
