import type { MonthlyStatsOutput } from '@hominem/rpc/finance';

import { useHonoQuery } from '~/lib/api';

export type MonthlyStatsContract = MonthlyStatsOutput & {
  topTag?: string;
  tagSpending?: Array<{ name: string | null; amount: number }>;
};

// month is 'YYYY-MM'
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const query = useHonoQuery<MonthlyStatsContract>(
    ['finance', 'analyze', 'monthly-stats', month],
    async ({ finance }) => {
      const response = await finance.analyze['monthly-stats'].$get({ query: { month: month! } });
      return response.json();
    },
    {
      enabled: !!month,
      staleTime: 5 * 60 * 1000,
      ...options,
    },
  );

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error?.message,
    refetch: query.refetch,
  };
}
