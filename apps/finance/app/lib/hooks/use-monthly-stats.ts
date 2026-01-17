import { trpc } from '../trpc'

export interface MonthlyStats {
  month: string
  startDate: string
  endDate: string
  totalIncome: number
  totalExpenses: number
  netIncome: number
  transactionCount: number
  categorySpending: Array<{ name: string | null; amount: number }>
}

/**
 * Custom hook to fetch monthly finance statistics using tRPC
 * @param month The month to fetch statistics for, in the format 'YYYY-MM'
 * @param options Additional options to pass to useQuery
 */
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const query = trpc.finance.analyze.monthlyStats.useQuery(
    // biome-ignore lint/style/noNonNullAssertion: This value will be provided by the parent component.
    { month: month! },
    {
      enabled: !!month,
      staleTime: 5 * 60 * 1000, // 5 minutes
      ...options,
    }
  )

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
