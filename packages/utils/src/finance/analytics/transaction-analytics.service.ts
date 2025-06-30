import { eq, sql, type SQL } from 'drizzle-orm'
import { db } from '../../db/index'
import { financeAccounts, transactions } from '../../db/schema/finance.schema'
import { logger } from '../../logger'
import { buildWhereConditions } from '../finance.transactions.service'
import type { CategorySummary, QueryOptions, TopMerchant } from '../finance.types'

/**
 * Summarize transactions by category
 */
export async function summarizeByCategory(options: QueryOptions): Promise<CategorySummary[]> {
  const whereConditions = buildWhereConditions(options)
  const limit = options.limit || 10

  const result = await db
    .select({
      category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`,
      count: sql<number>`COUNT(*)`,
      total: sql<number>`SUM(${transactions.amount})`,
      average: sql<number>`AVG(${transactions.amount})`,
      minimum: sql<number>`MIN(${transactions.amount})`,
      maximum: sql<number>`MAX(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
    .where(whereConditions)
    .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
    .having(sql`SUM(${transactions.amount}) < 0`)
    .orderBy(sql`SUM(${transactions.amount}) ASC`)
    .limit(limit)

  return result.map((row) => ({
    category: row.category,
    count: row.count,
    total: Number.parseFloat(row.total.toString()).toFixed(2),
    average: Number.parseFloat(row.average.toString()).toFixed(2),
    minimum: Number.parseFloat(row.minimum.toString()).toFixed(2),
    maximum: Number.parseFloat(row.maximum.toString()).toFixed(2),
  }))
}

/**
 * Summarize transactions by month
 */
export async function summarizeByMonth(options: QueryOptions) {
  const whereConditions = buildWhereConditions({ ...options, includeExcluded: true })

  const query = db
    .select({
      month: sql<string>`SUBSTR(${transactions.date}::text, 1, 7)`,
      count: sql<number>`COUNT(*)`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount}::numeric ELSE 0 END)`,
      expenses: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ABS(${transactions.amount}::numeric) ELSE 0 END)`,
      average: sql<number>`AVG(${transactions.amount}::numeric)`,
    })
    .from(transactions)
    .where(whereConditions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
    .groupBy(sql`SUBSTR(${transactions.date}::text, 1, 7)`)
    .orderBy(sql`SUBSTR(${transactions.date}::text, 1, 7) ASC`)

  const result = await query

  // Format the numeric values
  return result.map((row) => ({
    month: row.month,
    count: row.count,
    income: Number.parseFloat(row.income?.toString() || '0').toFixed(2),
    expenses: Number.parseFloat(row.expenses?.toString() || '0').toFixed(2),
    average: Number.parseFloat(row.average?.toString() || '0').toFixed(2),
  }))
}

/**
 * Find top merchants by spending
 */
export async function findTopMerchants(options: QueryOptions): Promise<TopMerchant[]> {
  const whereConditions = buildWhereConditions({ ...options, limit: undefined, type: 'expense' })
  const limit = options.limit || 10

  // Prefer merchantName, fallback to description, filter out empty/null
  // const merchantField = sql<string>`COALESCE(NULLIF(TRIM(${transactions.merchantName}), ''), NULLIF(TRIM(${transactions.description}), ''))`
  const descriptionField = sql<string>`TRIM(${transactions.description})`

  const result = await db
    .select({
      merchant: descriptionField,
      frequency: sql<number>`COUNT(*)`,
      totalSpent: sql<number>`SUM(${transactions.amount})`,
      firstTransaction: sql<string>`MIN(${transactions.date}::text)`,
      lastTransaction: sql<string>`MAX(${transactions.date}::text)`,
    })
    .from(transactions)
    .where(whereConditions)
    .groupBy(descriptionField)
    .having(sql`SUM(${transactions.amount}) < 0`)
    .orderBy(sql`SUM(${transactions.amount}) ASC`)
    .limit(limit)

  return (
    result
      // .filter((row) => row.merchant)
      .map((row) => ({
        merchant: row.merchant,
        frequency: row.frequency,
        totalSpent: Number.parseFloat(row.totalSpent.toString()).toFixed(2),
        firstTransaction: row.firstTransaction,
        lastTransaction: row.lastTransaction,
      }))
  )
}

/**
 * Calculate transaction statistics
 */
export async function calculateTransactions(
  options: QueryOptions & {
    calculationType?: 'sum' | 'average' | 'count' | 'stats'
    descriptionLike?: string
  }
) {
  // Create a new options object that includes the descriptionLike in the description field
  // to leverage the standardized condition building
  const enhancedOptions: QueryOptions = {
    ...options,
    // If descriptionLike is provided, use it as the description filter
    description: options.descriptionLike || options.description,
  }

  const whereConditions = buildWhereConditions(enhancedOptions)

  // If calculationType is specified, return just that metric
  if (options.calculationType && options.calculationType !== 'stats') {
    let aggregateSelection: Record<string, SQL<unknown>>

    switch (options.calculationType) {
      case 'sum':
        aggregateSelection = {
          value: sql<number>`SUM(CAST(${transactions.amount} AS DECIMAL))`.mapWith(Number),
        }
        break
      case 'average':
        aggregateSelection = {
          value: sql<number>`AVG(CAST(${transactions.amount} AS DECIMAL))`.mapWith(Number),
        }
        break
      case 'count':
        aggregateSelection = { value: sql<number>`COUNT(*)`.mapWith(Number) }
        break
      default:
        throw new Error(`Unsupported calculation type: ${options.calculationType}`)
    }

    const result = await db.select(aggregateSelection).from(transactions).where(whereConditions)

    return {
      value: result[0]?.value ?? 0,
      calculationType: options.calculationType,
    } as {
      value: number
      calculationType: 'sum' | 'average' | 'count'
    }
  }

  // Otherwise return all stats (default behavior)
  const result = await db
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<number>`SUM(${transactions.amount})`,
      average: sql<number>`AVG(${transactions.amount})`,
      minimum: sql<number>`MIN(${transactions.amount})`,
      maximum: sql<number>`MAX(${transactions.amount})`,
    })
    .from(transactions)
    .where(whereConditions)

  const stats = result[0] || { count: 0, total: 0, average: 0, minimum: 0, maximum: 0 }

  return {
    count: stats.count,
    total: Number.parseFloat(stats.total?.toString() || '0').toFixed(2),
    average: Number.parseFloat(stats.average?.toString() || '0').toFixed(2),
    minimum: Number.parseFloat(stats.minimum?.toString() || '0').toFixed(2),
    maximum: Number.parseFloat(stats.maximum?.toString() || '0').toFixed(2),
  }
}

/**
 * Get spending trends over time
 */
export async function getSpendingTrends(
  options: QueryOptions & { period: 'month' | 'quarter' | 'year' }
) {
  try {
    const whereConditions = buildWhereConditions({ ...options, type: 'expense' })

    let dateFormat: string
    switch (options.period) {
      case 'month':
        dateFormat = 'YYYY-MM'
        break
      case 'quarter':
        dateFormat = 'YYYY-Q'
        break
      case 'year':
        dateFormat = 'YYYY'
        break
      default:
        dateFormat = 'YYYY-MM'
    }

    const result = await db
      .select({
        period: sql<string>`to_char(${transactions.date}, ${dateFormat})`,
        totalSpent: sql<number>`SUM(ABS(${transactions.amount}))`,
        transactionCount: sql<number>`COUNT(*)`,
        averageSpent: sql<number>`AVG(ABS(${transactions.amount}))`,
      })
      .from(transactions)
      .where(whereConditions)
      .groupBy(sql`to_char(${transactions.date}, ${dateFormat})`)
      .orderBy(sql`to_char(${transactions.date}, ${dateFormat}) ASC`)

    return result.map((row) => ({
      period: row.period,
      totalSpent: Number.parseFloat(row.totalSpent.toString()).toFixed(2),
      transactionCount: row.transactionCount,
      averageSpent: Number.parseFloat(row.averageSpent.toString()).toFixed(2),
    }))
  } catch (error) {
    logger.error('Error getting spending trends:', error)
    throw error
  }
}

/**
 * Get income vs expenses comparison
 */
export async function getIncomeVsExpenses(options: QueryOptions) {
  try {
    const whereConditions = buildWhereConditions({ ...options, includeExcluded: true })

    const result = await db
      .select({
        income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END)`,
        expenses: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ABS(${transactions.amount}) ELSE 0 END)`,
        net: sql<number>`SUM(${transactions.amount})`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(transactions)
      .where(whereConditions)

    const stats = result[0] || { income: 0, expenses: 0, net: 0, transactionCount: 0 }

    return {
      income: Number.parseFloat(stats.income?.toString() || '0').toFixed(2),
      expenses: Number.parseFloat(stats.expenses?.toString() || '0').toFixed(2),
      net: Number.parseFloat(stats.net?.toString() || '0').toFixed(2),
      transactionCount: stats.transactionCount,
      savingsRate:
        stats.income > 0
          ? (
              ((Number.parseFloat(stats.income.toString()) -
                Number.parseFloat(stats.expenses.toString())) /
                Number.parseFloat(stats.income.toString())) *
              100
            ).toFixed(1)
          : '0.0',
    }
  } catch (error) {
    logger.error('Error getting income vs expenses:', error)
    throw error
  }
}
