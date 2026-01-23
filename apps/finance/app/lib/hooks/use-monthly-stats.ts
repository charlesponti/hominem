import { useHonoQuery } from '../hono';

export interface MonthlyStats {
  month: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  categorySpending: Array<{ name: string | null; amount: number }>;
}

/**
 * Custom hook to fetch monthly finance statistics using Hono RPC
 * @param month The month to fetch statistics for, in the format 'YYYY-MM'
 * @param options Additional options to pass to useQuery
 */
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const query = useHonoQuery<MonthlyStats>(
    ['finance', 'analyze', 'monthly-stats', month],
    async (client) => {
      const res = await client.api.finance.analyze['monthly-stats'].$post({
        json: { month: month! },
      });
      return res.json();
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
    error: query.error,
    refetch: query.refetch,
  };
}
