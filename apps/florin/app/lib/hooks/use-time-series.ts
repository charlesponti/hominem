import { useApiClient } from '@hominem/ui'
import type { TimeSeriesDataPoint, TimeSeriesStats } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useMemo } from 'react'
import { useSupabaseAuth } from '../supabase/use-auth'

export interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[]
  stats: TimeSeriesStats | null
  query: Record<string, unknown>
  timestamp: string
}

interface TimeSeriesParams {
  dateFrom?: Date
  dateTo?: Date
  account?: string
  category?: string
  includeStats?: boolean
  compareToPrevious?: boolean
  groupBy?: 'month' | 'week' | 'day'
  enabled?: boolean
}

/**
 * Custom hook to fetch and manage time series data using React Query
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
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

  // Generate a query key based on all parameters - memoize to prevent infinite re-renders
  const queryKey = useMemo(
    () => [
      'timeSeries',
      {
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString(),
        account,
        category,
        includeStats,
        compareToPrevious,
        groupBy,
      },
    ],
    [dateFrom, dateTo, account, category, includeStats, compareToPrevious, groupBy]
  )

  // Define the fetch function - memoize to prevent recreation on every render
  const fetchTimeSeriesData = useMemo(
    () => async (): Promise<TimeSeriesResponse> => {
      // Build query parameters
      const params = new URLSearchParams()
      if (dateFrom) params.append('from', format(dateFrom, 'yyyy-MM-dd'))
      if (dateTo) params.append('to', format(dateTo, 'yyyy-MM-dd'))
      if (account && account !== 'all') params.append('account', account)
      if (category) params.append('category', category)
      params.append('includeStats', includeStats.toString())
      params.append('compareToPrevious', compareToPrevious.toString())
      params.append('groupBy', groupBy)

      const queryString = params.toString()
      return await apiClient.get<never, TimeSeriesResponse>(
        `/api/finance/analyze/spending-time-series?${queryString}`
      )
    },
    [apiClient, dateFrom, dateTo, account, category, includeStats, compareToPrevious, groupBy]
  )

  // Use React Query to manage the data fetching
  const query = useQuery<TimeSeriesResponse, Error>({
    queryKey,
    queryFn: fetchTimeSeriesData,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Only retry 2 times before giving up
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnReconnect: false, // Don't refetch when network reconnects
  })

  // Helper to format date labels based on grouping
  const formatDateLabel = (dateStr: string): string => {
    if (groupBy === 'month') {
      // Convert YYYY-MM to MMM YYYY
      const [year, month] = dateStr.split('-')
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          year: 'numeric',
        }
      )
    }
    return dateStr
  }

  // Format data for charts
  const chartData = query.data?.data.map((item) => ({
    name: formatDateLabel(item.date),
    Spending: Math.abs(item.expenses),
    Income: Math.abs(item.income),
    Count: item.count,
    Average: Math.abs(item.average),
    ...(item.trend ? { TrendChange: Number.parseFloat(item.trend.raw) } : {}),
  }))

  return {
    ...query,
    chartData,
    formatDateLabel,
    refetch: query.refetch,
  }
}
