import { useRpcQuery } from '@hominem/rpc/react';
import type { MonthlyStatsOutput } from '@hominem/rpc/types/finance.types';

export type MonthlyStatsContract = MonthlyStatsOutput & {
  topTag?: string;
  tagSpending?: Array<{ name: string | null; amount: number }>;
};

/**
 * Custom hook to fetch monthly finance statistics using Hono RPC
 * @param month The month to fetch statistics for, in the format 'YYYY-MM'
 * @param options Additional options to pass to useQuery
 */
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const query = useRpcQuery(
    ({ finance }) => finance.getMonthlyStats({ month: month! }) as Promise<MonthlyStatsContract>,
    {
      queryKey: ['finance', 'analyze', 'monthly-stats', month],
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
