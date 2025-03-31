import { type QueryOptions, summarizeByMonth } from '@ponti/utils/finance'

// Define interface for time series data points
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

// Define interface for time series stats
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

// Define interface for time series response
export interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[]
  stats: TimeSeriesStats | null
  query: Record<string, unknown>
  timestamp: string
}

/**
 * Generate time series data from monthly summaries
 */
export async function generateTimeSeriesData(
  options: QueryOptions & {
    compareToPrevious?: boolean
    includeStats?: boolean
    groupBy?: 'month' | 'week' | 'day'
  }
): Promise<TimeSeriesResponse> {
  // Get monthly summaries from the finance service
  const monthlySummaries = await summarizeByMonth(options)

  // Transform into enhanced time series format
  const timeSeries = monthlySummaries.map((summary, index, array) => {
    const current: TimeSeriesDataPoint = {
      date: summary.month,
      amount: Number.parseFloat(summary.total),
      count: summary.count,
      average: Number.parseFloat(summary.average),
      formattedAmount: `$${Number.parseFloat(summary.total).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    }

    // Add trend indicators if we have previous data
    if (options.compareToPrevious && index < array.length - 1) {
      const previous = array[index + 1]
      const previousAmount = Number.parseFloat(previous.total)
      const currentAmount = Number.parseFloat(summary.total)
      const percentChange = ((currentAmount - previousAmount) / Math.abs(previousAmount)) * 100

      current.trend = {
        direction: currentAmount > previousAmount ? 'up' : 'down',
        percentChange: Math.abs(percentChange).toFixed(1),
        raw: percentChange.toFixed(1),
        previousAmount: previousAmount,
        formattedPreviousAmount: `$${previousAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      }
    }

    return current
  })

  // Generate statistics if requested
  let stats = null
  if (options.includeStats && timeSeries.length > 0) {
    stats = calculateTimeSeriesStats(timeSeries)
  }

  return {
    data: timeSeries,
    stats,
    query: {
      from: options.from,
      to: options.to,
      account: options.account,
      category: options.category,
      limit: options.limit,
      groupBy: options.groupBy || 'month',
    },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Calculate statistics for time series data
 */
export function calculateTimeSeriesStats(timeSeriesData: TimeSeriesDataPoint[]): TimeSeriesStats {
  const amounts = timeSeriesData.map((item) => item.amount)
  const total = amounts.reduce((sum, amount) => sum + amount, 0)
  const average = total / amounts.length
  const sorted = [...amounts].sort((a, b) => a - b)
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

  return {
    total,
    average,
    median,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    count: timeSeriesData.length,
    formattedTotal: `$${total.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    periodCovered: `${timeSeriesData[timeSeriesData.length - 1]?.date} to ${timeSeriesData[0]?.date}`,
  }
}
