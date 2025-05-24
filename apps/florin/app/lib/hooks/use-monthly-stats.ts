import { useApiClient } from '@hominem/ui'
import { useQuery } from '@tanstack/react-query'

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

// Define query keys as constants for consistent cache management
const MONTHLY_STATS_KEY = ['finance', 'monthly-stats']

/**
 * Custom hook to fetch monthly finance statistics using React Query
 * @param month The month to fetch statistics for, in the format 'YYYY-MM'
 * @param options Additional options to pass to useQuery
 */
export function useMonthlyStats(month: string | undefined | null, options = {}) {
  const apiClient = useApiClient()

  const queryKey = [...MONTHLY_STATS_KEY, month]

  const query = useQuery<MonthlyStats>({
    queryKey,
    queryFn: async () => {
      if (!month) {
        throw new Error('Month parameter is required')
      }

      return await apiClient.get<never, MonthlyStats>(`/api/finance/monthly-stats/${month}`)
    },
    enabled: !!month,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
