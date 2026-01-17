import { count, desc, eq, type SQL, sql } from 'drizzle-orm'
import { db } from '@hominem/db'
import { financeAccounts, transactions } from '@hominem/db/schema'
import { buildWhereConditions } from '../finance.transactions.service'
import type { CategorySummary, QueryOptions, TopMerchant } from '../finance.types'

const formatCurrency = (amount: number): string => {
  return Number.parseFloat(amount.toString() || '0').toFixed(2)
}

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
    total: formatCurrency(row.total),
    average: formatCurrency(row.average),
    minimum: formatCurrency(row.minimum),
    maximum: formatCurrency(row.maximum),
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
    income: formatCurrency(row.income),
    expenses: formatCurrency(row.expenses),
    average: formatCurrency(row.average),
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
        totalSpent: formatCurrency(row.totalSpent),
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
    total: formatCurrency(stats.total),
    average: formatCurrency(stats.average),
    minimum: formatCurrency(stats.minimum),
    maximum: formatCurrency(stats.maximum),
  }
}

export async function getMonthlyStats(params: { month: string; userId: string }) {
  const { month, userId } = params
  const startDate = new Date(`${month}-01T00:00:00.000Z`)
  const endDate = new Date(startDate)
  endDate.setMonth(startDate.getMonth() + 1)

  const monthFilter = buildWhereConditions({
    userId,
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0],
  })

  const totalsResult = await db
    .select({
      totalIncome:
        sql<number>`sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end)`.mapWith(
          Number
        ),
      totalExpenses:
        sql<number>`sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end)`.mapWith(
          Number
        ),
      transactionCount: count(),
    })
    .from(transactions)
    .where(monthFilter)

  const { totalIncome = 0, totalExpenses = 0, transactionCount = 0 } = totalsResult[0] ?? {}

  const categorySpendingFilter = buildWhereConditions({
    userId,
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0],
    type: 'expense',
  })

  const categorySpendingResult = await db
    .select({
      category: transactions.category,
      amount: sql<number>`sum(abs(${transactions.amount}::numeric))`.mapWith(Number),
    })
    .from(transactions)
    .where(categorySpendingFilter)
    .groupBy(transactions.category)
    .orderBy(desc(sql<number>`sum(abs(${transactions.amount}::numeric))`))

  return {
    month,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    transactionCount,
    categorySpending: categorySpendingResult.map((c) => ({
      name: c.category,
      amount: c.amount,
    })),
  }
}
