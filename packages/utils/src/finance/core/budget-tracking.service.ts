import { db } from '@hominem/data/db'
import { budgetCategories, transactions } from '@hominem/data/schema'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import type {
  BudgetCategoryWithSpending,
  BudgetChartData,
  BudgetHistoryData,
  BudgetPieData,
  BudgetSummary,
  BudgetTrackingData,
} from '../types/budget.types'
import { getBudgetStatus, getChartColor, getStatusColor } from './budget.utils'

/**
 * Get budget categories with spending data for a specific month
 */
export async function getBudgetCategoriesWithSpending(options: {
  userId: string
  monthYear: string // Format: "YYYY-MM"
}): Promise<BudgetCategoryWithSpending[]> {
  const { userId, monthYear } = options

  // Parse month/year
  const [yearStr, monthStr] = monthYear.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (Number.isNaN(year) || Number.isNaN(month)) {
    throw new Error(`Invalid monthYear format: ${monthYear}. Expected format: YYYY-MM`)
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0) // Last day of the month

  // Get budget categories
  const categories = await db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.userId, userId))
    .orderBy(budgetCategories.name)

  // Get spending data for the month
  const spendingData = await db
    .select({
      category: transactions.category,
      amount: sql<number>`SUM(ABS(${transactions.amount}))`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, 'expense'),
        eq(transactions.excluded, false)
      )
    )
    .groupBy(transactions.category)

  // Create a map for quick lookup
  const spendingMap = new Map(
    spendingData.map((item) => [item.category?.toLowerCase(), Number(item.amount)])
  )

  // Transform categories with spending data and UI properties
  return categories.map((category, index) => {
    const budgetAmount = Number.parseFloat(category.averageMonthlyExpense || '0')
    const actualSpending = spendingMap.get(category.name.toLowerCase()) || 0
    const percentageSpent = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0
    const variance = budgetAmount - actualSpending

    const status = getBudgetStatus(percentageSpent)

    return {
      ...category,
      type: category.type as 'income' | 'expense',
      actualSpending,
      percentageSpent,
      budgetAmount,
      variance,
      remaining: variance,
      color: category.color || getChartColor(index),
      status,
      statusColor: getStatusColor(status),
    }
  })
}

/**
 * Calculate budget summary from categories
 */
export function calculateBudgetSummary(categories: BudgetCategoryWithSpending[]): BudgetSummary {
  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgetAmount, 0)
  const totalActual = categories.reduce((sum, cat) => sum + cat.actualSpending, 0)
  const totalVariance = totalBudgeted - totalActual
  const budgetUsagePercentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0

  return {
    totalBudgeted,
    totalActual,
    totalVariance,
    budgetUsagePercentage,
    isOverBudget: totalActual > totalBudgeted,
    categories,
  }
}

/**
 * Generate chart data for budget vs actual comparison
 */
export function generateChartData(categories: BudgetCategoryWithSpending[]): BudgetChartData[] {
  return categories.map((category) => ({
    name: category.name.length > 15 ? `${category.name.slice(0, 15)}...` : category.name,
    fullName: category.name,
    budgeted: category.budgetAmount,
    actual: category.actualSpending,
    variance: category.variance,
  }))
}

/**
 * Generate pie chart data for spending distribution
 */
export function generatePieData(categories: BudgetCategoryWithSpending[]): BudgetPieData[] {
  return categories
    .filter((category) => category.actualSpending > 0)
    .map((category, index) => ({
      name: category.name,
      value: category.actualSpending,
      fill: getChartColor(index),
    }))
}

/**
 * Get budget tracking data for a specific month
 */
export async function getBudgetTrackingData(options: {
  userId: string
  monthYear: string
}): Promise<BudgetTrackingData> {
  const categories = await getBudgetCategoriesWithSpending(options)
  const summary = calculateBudgetSummary(categories)
  const chartData = generateChartData(categories)
  const pieData = generatePieData(categories)

  return {
    monthYear: options.monthYear,
    summary,
    categories,
    chartData,
    pieData,
  }
}

/**
 * Get budget history data
 */
export async function getBudgetHistory(options: {
  userId: string
  months: number
}): Promise<BudgetHistoryData[]> {
  const { userId, months } = options
  const today = new Date()
  const results: BudgetHistoryData[] = []

  // Get total monthly budget from categories
  const categories = await db
    .select()
    .from(budgetCategories)
    .where(and(eq(budgetCategories.userId, userId), eq(budgetCategories.type, 'expense')))

  const totalMonthlyBudget = categories.reduce(
    (sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
    0
  )

  // Generate data for each month
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    // Get actual spending for the month
    const spendingResult = await db
      .select({
        amount: sql<number>`SUM(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
          eq(transactions.type, 'expense'),
          eq(transactions.excluded, false)
        )
      )

    const actualSpending = Number(spendingResult[0]?.amount || 0)
    const displayMonth = targetDate.toLocaleString('default', {
      month: 'short',
      year: 'numeric',
    })

    results.push({
      date: displayMonth,
      budgeted: totalMonthlyBudget,
      actual: actualSpending,
    })
  }

  return results.reverse() // Oldest to newest
}
