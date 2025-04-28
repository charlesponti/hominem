import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useApiClient } from '~/lib/hooks/use-api-client'

// Define TS interfaces
export interface TimeSeriesDataPoint {
  date: string
  amount: number
  count: number
  average: number
  formattedAmount: string
  trend?: {
    direction: 'up' | 'down'
    percentChange: string
    raw: string
    previousAmount: number
    formattedPreviousAmount: string
  }
}

export interface TimeSeriesStats {
  total: number
  average: number
  median: number
  min: number
  max: number
  count: number
  formattedTotal: string
  periodCovered: string
}

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
  const apiClient = useApiClient()

  // Generate a query key based on all parameters
  const queryKey = [
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
  ]

  // Define the fetch function
  const fetchTimeSeriesData = async (): Promise<TimeSeriesResponse> => {
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
  }

  // Use React Query to manage the data fetching
  const query = useQuery<TimeSeriesResponse, Error>({
    queryKey,
    queryFn: fetchTimeSeriesData,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    Spending: Math.abs(item.amount),
    Count: item.count,
    Average: Math.abs(item.average),
    ...(item.trend ? { TrendChange: Number.parseFloat(item.trend.raw) } : {}),
  }))

  // Format currency
  const formatCurrency = (value: number | string) => {
    const formattedValue = typeof value === 'string' ? Number.parseFloat(value) : value
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(formattedValue)
  }

  return {
    ...query,
    chartData,
    formatDateLabel,
    formatCurrency,
    refetch: query.refetch,
  }
}
