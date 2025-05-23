import { summarizeByMonth } from './finance.service'
import type { QueryOptions } from './finance.types'

// Define interface for time series data points
export interface TimeSeriesDataPoint {
  date: string
  amount: number
  count: number
  average: number
  formattedAmount: string
  income: number
  expenses: number
  formattedIncome: string
  formattedExpenses: string
  trend?: {
    direction: 'up' | 'down'
    percentChange: string
    raw: string
    previousAmount: number
    formattedPreviousAmount: string
    percentChangeExpenses: string
    rawExpenses: string
    previousExpenses: number
    formattedPreviousExpenses: string
    directionExpenses: 'up' | 'down'
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
  totalIncome: number
  averageIncome: number
  medianIncome: number
  minIncome: number
  maxIncome: number
  formattedTotalIncome: string
  totalExpenses: number
  averageExpenses: number
  medianExpenses: number
  minExpenses: number
  maxExpenses: number
  formattedTotalExpenses: string
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
 * Helper function to format currency values consistently
 */
const formatCurrency = (value: number): string =>
  `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * Helper function to calculate median of a number array
 */
const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0
  if (values.length === 1 && values[0] !== undefined) return values[0]

  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted[Math.floor(sorted.length / 2)]
  const beforeMiddle = sorted[Math.floor(sorted.length / 2) - 1]
  if (!middle || !beforeMiddle) {
    return 0
  }

  return sorted.length % 2 === 0 ? (beforeMiddle + middle) / 2 : middle
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
    const income = Number.parseFloat(summary.income)
    const expenses = Number.parseFloat(summary.expenses || '0')

    const current: TimeSeriesDataPoint = {
      date: summary.month,
      // Deprecated: amount is income + expenses, but should not be used for net calculations
      amount: income + expenses,
      income: income,
      expenses: expenses,
      count: summary.count,
      average: Number.parseFloat(summary.average),
      formattedIncome: formatCurrency(income),
      formattedExpenses: formatCurrency(expenses),
      formattedAmount: formatCurrency(income), // Deprecated, kept for compatibility
    }

    // Add trend indicators if we have previous data
    if (options.compareToPrevious && index < array.length - 1) {
      const previousSummary = array[index + 1]
      const previousIncome = Number.parseFloat(previousSummary ? previousSummary.income : '0')
      const previousExpenses = Number.parseFloat(
        previousSummary ? previousSummary.expenses || '0' : '0'
      )
      const percentChangeIncome =
        previousIncome === 0
          ? income === 0
            ? 0
            : Number.POSITIVE_INFINITY
          : ((income - previousIncome) / Math.abs(previousIncome)) * 100
      const percentChangeExpenses =
        previousExpenses === 0
          ? expenses === 0
            ? 0
            : Number.POSITIVE_INFINITY
          : ((expenses - previousExpenses) / Math.abs(previousExpenses)) * 100

      current.trend = {
        // Income trend
        direction: income > previousIncome ? 'up' : 'down',
        percentChange: Math.abs(percentChangeIncome).toFixed(1),
        raw: percentChangeIncome.toFixed(1),
        previousAmount: previousIncome,
        formattedPreviousAmount: formatCurrency(previousIncome),
        // Expenses trend
        percentChangeExpenses: Math.abs(percentChangeExpenses).toFixed(1),
        rawExpenses: percentChangeExpenses.toFixed(1),
        previousExpenses: previousExpenses,
        formattedPreviousExpenses: formatCurrency(previousExpenses),
        directionExpenses: expenses > previousExpenses ? 'up' : 'down',
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
 * Generate time series data for a specific category over time
 */
export async function generateCategoryTimeSeriesData(
  options: QueryOptions & {
    category: string
    compareToPrevious?: boolean
    includeStats?: boolean
    groupBy?: 'month' | 'week' | 'day'
  }
): Promise<TimeSeriesResponse> {
  // Delegate to generic time series generator
  return generateTimeSeriesData(options)
}

/**
 * Calculate statistics for time series data
 */
export function calculateTimeSeriesStats(timeSeriesData: TimeSeriesDataPoint[]): TimeSeriesStats {
  const amounts = timeSeriesData.map((item) => item.amount)
  const incomes = timeSeriesData.map((item) => item.income)
  const expenses = timeSeriesData.map((item) => item.expenses)

  const total = amounts.reduce((sum, amount) => sum + amount, 0)
  const totalIncome = incomes.reduce((sum, income) => sum + income, 0)
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense, 0)

  const average = total / amounts.length
  const averageIncome = totalIncome / incomes.length
  const averageExpenses = totalExpenses / expenses.length

  const median = calculateMedian(amounts)
  const medianIncome = calculateMedian(incomes)
  const medianExpenses = calculateMedian(expenses)

  return {
    total,
    average,
    median,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
    count: timeSeriesData.length,
    formattedTotal: formatCurrency(total),
    totalIncome,
    averageIncome,
    medianIncome,
    minIncome: Math.min(...incomes),
    maxIncome: Math.max(...incomes),
    formattedTotalIncome: formatCurrency(totalIncome),
    totalExpenses,
    averageExpenses,
    medianExpenses,
    minExpenses: Math.min(...expenses),
    maxExpenses: Math.max(...expenses),
    formattedTotalExpenses: formatCurrency(totalExpenses),
    periodCovered: `${timeSeriesData[timeSeriesData.length - 1]?.date} to ${timeSeriesData[0]?.date}`,
  }
}
