import type { MonthlyStatsOutput } from '@hominem/hono-rpc/types/finance.types';

import { useHonoQuery } from '~/lib/api';

/**
 * Custom hook to fetch monthly finance statistics using Hono RPC
 * @param month The month to fetch statistics for, in the format 'YYYY-MM'
 * @param options Additional options to pass to useQuery
 */
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const query = useHonoQuery<MonthlyStatsOutput>(
    ['finance', 'analyze', 'monthly-stats', month],
    async (client) => {
      const res = await client.api.finance.analyze['monthly-stats'].$post({
        json: { month: month! },
      });
      return res.json() as unknown as Promise<MonthlyStatsOutput>;
    },
    {
      enabled: !!month,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
