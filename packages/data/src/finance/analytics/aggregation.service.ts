import type { FinanceTransaction } from '../../db/schema'
import type { CategoryAggregate } from '../finance.types'

/**
 * Parses the amount to a number.
 */
export function parseAmount(amount: string | number): number {
  return typeof amount === 'string' ? Number.parseFloat(amount) : amount
}

/**
 * Calculate the median of a number array
 */
export function calculateMedian(values: number[]): number {
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
 * Format currency values consistently
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Aggregate transactions by category (in-memory processing)
 */
export function aggregateByCategory(transactions: FinanceTransaction[]): CategoryAggregate[] {
  return Object.entries(
    transactions.reduce<Record<string, { totalAmount: number; count: number }>>((acc, tx) => {
      const category = tx.category || 'Other'
      const categoryRecord = acc[category] || { totalAmount: 0, count: 0 }

      categoryRecord.totalAmount += parseAmount(tx.amount)
      categoryRecord.count++
      acc[category] = categoryRecord

      return acc
    }, {})
  ).map(([category, { totalAmount, count }]) => ({
    category,
    totalAmount,
    count,
  }))
}

/**
 * Aggregate transactions by month (in-memory processing)
 */
export function aggregateByMonth(transactions: FinanceTransaction[]) {
  return Object.entries(
    transactions.reduce<Record<string, { totalAmount: number; count: number }>>((acc, tx) => {
      const month = tx.date.toISOString().substring(0, 7)
      const monthRecord = acc[month] || { totalAmount: 0, count: 0 }

      monthRecord.totalAmount += parseAmount(tx.amount)
      monthRecord.count++
      acc[month] = monthRecord

      return acc
    }, {})
  ).map(([month, { totalAmount, count }]) => ({
    month,
    totalAmount,
    count,
  }))
}

/**
 * Aggregate transactions by account (in-memory processing)
 */
export function aggregateByAccount(transactions: FinanceTransaction[]) {
  return Object.entries(
    transactions.reduce<Record<string, { totalAmount: number; count: number }>>((acc, tx) => {
      const accountId = tx.accountId
      const accountRecord = acc[accountId] || { totalAmount: 0, count: 0 }

      accountRecord.totalAmount += parseAmount(tx.amount)
      accountRecord.count++
      acc[accountId] = accountRecord

      return acc
    }, {})
  ).map(([accountId, { totalAmount, count }]) => ({
    accountId,
    totalAmount,
    count,
  }))
}

/**
 * Calculate basic statistics for a set of transactions
 */
export function calculateTransactionStats(transactions: FinanceTransaction[]) {
  if (transactions.length === 0) {
    return {
      count: 0,
      total: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      formattedTotal: formatCurrency(0),
      formattedAverage: formatCurrency(0),
    }
  }

  const amounts = transactions.map((tx) => parseAmount(tx.amount))
  const total = amounts.reduce((sum, amount) => sum + amount, 0)
  const average = total / amounts.length
  const median = calculateMedian(amounts)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)

  return {
    count: transactions.length,
    total,
    average,
    median,
    min,
    max,
    formattedTotal: formatCurrency(total),
    formattedAverage: formatCurrency(average),
  }
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : Number.POSITIVE_INFINITY
  }
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Calculate trend direction and percentage change
 */
export function calculateTrend(current: number, previous: number) {
  const percentChange = calculatePercentageChange(current, previous)

  return {
    direction: current > previous ? 'up' : 'down',
    percentChange: Math.abs(percentChange).toFixed(1),
    raw: percentChange.toFixed(1),
    previousValue: previous,
    formattedPreviousValue: formatCurrency(previous),
  }
}

/**
 * Group transactions by date range
 */
export function groupTransactionsByDateRange(
  transactions: FinanceTransaction[],
  range: 'day' | 'week' | 'month' | 'quarter' | 'year'
) {
  const grouped = transactions.reduce<Record<string, FinanceTransaction[]>>((acc, tx) => {
    let key: string

    switch (range) {
      case 'day':
        key = tx.date.toISOString().substring(0, 10)
        break
      case 'week': {
        // Simple week grouping - could be improved with proper week calculation
        const weekStart = new Date(tx.date)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        key = weekStart.toISOString().substring(0, 10)
        break
      }
      case 'month':
        key = tx.date.toISOString().substring(0, 7)
        break
      case 'quarter': {
        const quarter = Math.floor((tx.date.getMonth() + 3) / 3)
        key = `${tx.date.getFullYear()}-Q${quarter}`
        break
      }
      case 'year':
        key = tx.date.getFullYear().toString()
        break
      default:
        key = tx.date.toISOString().substring(0, 7)
    }

    if (!acc[key]) {
      acc[key] = []
    }

    if (acc[key]) {
      acc[key]?.push(tx)
    }

    return acc
  }, {})

  return Object.entries(grouped).map(([key, txs]) => ({
    period: key,
    transactions: txs,
    stats: calculateTransactionStats(txs),
  }))
}
