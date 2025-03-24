import { and, eq, gte, like, lte, sql } from 'drizzle-orm'
import { db } from '../../../db'
import { transactionAccounts, transactionNames, transactions } from '../../../db/schema'
import logger from './logger'

export interface QueryOptions {
  from?: string
  to?: string
  category?: string
  min?: string
  max?: string
  account?: string
  limit?: string
  top?: string
}

// Function to build WHERE clause filters based on options
function buildWhereConditions(options: QueryOptions) {
  const conditions = []

  if (options.from) {
    conditions.push(gte(transactions.date, options.from))
  }

  if (options.to) {
    conditions.push(lte(transactions.date, options.to))
  }

  if (options.category) {
    conditions.push(
      sql`(${transactions.category} = ${options.category} OR ${transactions.parentCategory} = ${options.category})`
    )
  }

  if (options.min) {
    conditions.push(gte(transactions.amount, Number.parseFloat(options.min)))
  }

  if (options.max) {
    conditions.push(lte(transactions.amount, Number.parseFloat(options.max)))
  }

  if (options.account) {
    conditions.push(like(transactionAccounts.accountName, `%${options.account}%`))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

// Query transactions with filters
export async function queryTransactions(options: QueryOptions) {
  logger.info(JSON.stringify({ ms: 'Querying transactions', options }, null, 2))

  const whereConditions = buildWhereConditions(options)
  const limit = options.limit ? Number.parseInt(options.limit) : 100

  // Query transactions with accounts
  const result = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      name: transactions.name,
      amount: transactions.amount,
      status: transactions.status,
      category: transactions.category,
      parentCategory: transactions.parentCategory,
      type: transactions.type,
      accountName: transactionAccounts.accountName,
      note: transactions.note,
    })
    .from(transactions)
    .leftJoin(transactionAccounts, eq(transactions.id, transactionAccounts.transactionId))
    .where(whereConditions)
    .orderBy(sql`${transactions.date} DESC`)
    .limit(limit)

  return result
}

// Summarize transactions by category
export async function summarizeByCategory(options: QueryOptions) {
  logger.info(JSON.stringify({ ms: 'Summarizing by category', options }, null, 2))

  const whereConditions = buildWhereConditions(options)
  const limit = options.top ? Number.parseInt(options.top) : 10

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
    .leftJoin(transactionAccounts, eq(transactions.id, transactionAccounts.transactionId))
    .where(whereConditions)
    .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
    // .orderBy(sql`total DESC`)
    .limit(limit)

  // Format the numeric values
  return result.map((row) => ({
    category: row.category,
    count: row.count,
    total: Number.parseFloat(row.total.toString()).toFixed(2),
    average: Number.parseFloat(row.average.toString()).toFixed(2),
    minimum: Number.parseFloat(row.minimum.toString()).toFixed(2),
    maximum: Number.parseFloat(row.maximum.toString()).toFixed(2),
  }))
}

// Summarize transactions by month
export async function summarizeByMonth(options: QueryOptions) {
  logger.info(
    JSON.stringify(
      {
        msg: 'Summarizing by month',
        options,
      },
      null,
      2
    )
  )

  const whereConditions = buildWhereConditions(options)

  const result = await db
    .select({
      month: sql<string>`SUBSTR(${transactions.date}, 1, 7)`,
      count: sql<number>`COUNT(*)`,
      total: sql<number>`SUM(${transactions.amount})`,
      average: sql<number>`AVG(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(transactionAccounts, eq(transactions.id, transactionAccounts.transactionId))
    .where(whereConditions)
    .groupBy(sql`SUBSTR(${transactions.date}, 1, 7)`)
    .orderBy(sql`month DESC`)

  // Format the numeric values
  return result.map((row) => ({
    month: row.month,
    count: row.count,
    total: Number.parseFloat(row.total.toString()).toFixed(2),
    average: Number.parseFloat(row.average.toString()).toFixed(2),
  }))
}

// Find top merchants by total spend
export async function findTopMerchants(options: QueryOptions) {
  logger.info(
    JSON.stringify(
      {
        msg: 'Finding top merchants',
        options,
      },
      null,
      2
    )
  )

  const whereConditions = buildWhereConditions(options)
  const limit = options.top ? Number.parseInt(options.top) : 10

  const result = await db
    .select({
      merchant: transactionNames.name,
      frequency: sql<number>`COUNT(*)`,
      totalSpent: sql<number>`SUM(${transactions.amount})`,
      firstTransaction: sql<string>`MIN(${transactions.date})`,
      lastTransaction: sql<string>`MAX(${transactions.date})`,
    })
    .from(transactions)
    .leftJoin(transactionNames, eq(transactions.id, transactionNames.transactionId))
    .leftJoin(transactionAccounts, eq(transactions.id, transactionAccounts.transactionId))
    .where(whereConditions)
    .groupBy(transactionNames.name)
    .orderBy(sql`totalSpent DESC`)
    .limit(limit)

  // Format the numeric values
  return result.map((row) => ({
    merchant: row.merchant,
    frequency: row.frequency,
    totalSpent: Number.parseFloat(row.totalSpent.toString()).toFixed(2),
    firstTransaction: row.firstTransaction,
    lastTransaction: row.lastTransaction,
  }))
}
