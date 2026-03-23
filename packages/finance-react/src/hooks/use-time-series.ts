import type { SpendingTimeSeriesOutput } from '@hominem/rpc/types/finance.types';
import { format } from 'date-fns';

import { useRpcQuery } from '@hominem/rpc/react';

interface TimeSeriesParams {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  account?: string | undefined;
  tag?: string | undefined;
  includeStats?: boolean | undefined;
  compareToPrevious?: boolean | undefined;
  groupBy?: 'month' | 'week' | 'day' | undefined;
  enabled?: boolean | undefined;
}

export function useTimeSeriesData({
  dateFrom,
  dateTo,
  account,
  tag,
  includeStats = true,
  compareToPrevious = true,
  groupBy = 'month',
  enabled = true,
}: TimeSeriesParams) {
  const query = useRpcQuery(
    ({ finance }) =>
      finance.getSpendingTimeSeries({
        ...(dateFrom ? { from: format(dateFrom, 'yyyy-MM-dd') } : {}),
        ...(dateTo ? { to: format(dateTo, 'yyyy-MM-dd') } : {}),
        ...(account && account !== 'all' ? { account } : {}),
        ...(tag ? { tag } : {}),
        includeStats,
        compareToPrevious,
        groupBy,
      }),
    {
      queryKey: [
        'finance',
        'analyze',
        'spending-time-series',
        {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
          account,
          tag,
          includeStats,
          compareToPrevious,
          groupBy,
        },
      ],
      enabled,
      staleTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const formatDateLabel = (dateStr: string) => {
    if (groupBy === 'month') {
      const parts = dateStr.split('-');
      const year = parts[0];
      const month = parts[1];
      if (!year || !month) return dateStr;
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

  const chartData = Array.isArray(query.data?.data)
    ? query.data.data.map((item) => ({
        name: formatDateLabel(item.date),
        Spending: Math.abs(item.expenses || 0),
        Income: Math.abs(item.income || 0),
        Count: item.count,
        Average: Math.abs(item.average || 0),
        ...(item.trend ? { TrendChange: Number.parseFloat(item.trend.raw) } : {}),
      }))
    : [];

  return {
    ...query,
    chartData,
    formatDateLabel,
  };
}
