import { db } from '@ponti/utils/db'
import logger from '@ponti/utils/logger'
import {
  financeAccounts,
  transactions,
  type Transaction,
  type TransactionInsert,
} from '@ponti/utils/schema'
import type { SQLWrapper } from 'drizzle-orm'
import { and, eq, gte, like, lte, sql } from 'drizzle-orm'
import fs from 'fs-extra'
import { parseAmount } from './finance.utils'
import type { CategoryAggregate, DateRangeInput } from './types'

export interface QueryOptions {
  from?: string
  to?: string
  category?: string
  min?: string
  max?: string
  account?: string
  limit?: number
}

export function buildWhereConditions(options: QueryOptions) {
  const conditions = []

  if (options.from) {
    conditions.push(gte(transactions.date, new Date(options.from)))
  }

  if (options.to) {
    conditions.push(lte(transactions.date, new Date(options.to)))
  }

  if (options.category) {
    conditions.push(
      sql`(${transactions.category} = ${options.category} OR ${transactions.parentCategory} = ${options.category})`
    )
  }

  if (options.min) {
    conditions.push(gte(transactions.amount, options.min))
  }

  if (options.max) {
    conditions.push(lte(transactions.amount, options.max))
  }

  if (options.account) {
    conditions.push(like(financeAccounts.name, `%${options.account}%`))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function queryTransactions(options: QueryOptions) {
  logger.info(JSON.stringify({ ms: 'Querying transactions', options }, null, 2))

  const whereConditions = buildWhereConditions(options)
  const limit = options.limit || 100

  const result = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      status: transactions.status,
      category: transactions.category,
      parentCategory: transactions.parentCategory,
      type: transactions.type,
      accountMask: transactions.accountMask,
      note: transactions.note,
    })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.fromAccountId, financeAccounts.id))
    .where(whereConditions)
    .orderBy(sql`${transactions.date} DESC`)
    .limit(limit)

  return result
}

export async function summarizeByCategory(options: QueryOptions) {
  logger.info(JSON.stringify({ ms: 'Summarizing by category', options }, null, 2))

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
    // .leftJoin(financeAccounts, eq(transactions.fromAccountId, financeAccounts.id))
    .where(whereConditions)
    .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
    .orderBy(sql`total DESC`)
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
      month: sql<string>`SUBSTR(${transactions.date}::text, 1, 7)`,
      count: sql<number>`COUNT(*)`,
      total: sql<number>`SUM(${transactions.amount})`,
      average: sql<number>`AVG(${transactions.amount})`,
    })
    .from(transactions)
    .where(whereConditions)
    .groupBy(sql`SUBSTR(${transactions.date}::text, 1, 7)`)
    .orderBy(sql`month DESC`)

  // Format the numeric values
  return result.map((row) => ({
    month: row.month,
    count: row.count,
    total: Number.parseFloat(row.total.toString()).toFixed(2),
    average: Number.parseFloat(row.average.toString()).toFixed(2),
  }))
}

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
  const limit = options.limit || 10

  const result = await db
    .select({
      merchant: transactions.description,
      frequency: sql<number>`COUNT(*)`,
      totalSpent: sql<number>`SUM(${transactions.amount})`,
      firstTransaction: sql<string>`MIN(${transactions.date}::text)`,
      lastTransaction: sql<string>`MAX(${transactions.date}::text)`,
    })
    .from(transactions)
    .where(whereConditions)
    .groupBy(transactions.description)
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

export function getDateRangeConditions(dateRange?: DateRangeInput): SQLWrapper[] {
  const conditions: SQLWrapper[] = []
  if (dateRange?.from) {
    conditions.push(gte(transactions.date, new Date(dateRange.from)))
  }
  if (dateRange?.to) {
    conditions.push(lte(transactions.date, new Date(dateRange.to)))
  }
  return conditions
}

export function aggregateByCategory(transactions: Transaction[]): CategoryAggregate[] {
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

export function aggregateByMonth(transactions: Transaction[]) {
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

export type ProcessingStats = { processed: number; skipped: number; merged: number }

export function isSimilarTransaction(tx1: TransactionInsert, tx2: TransactionInsert): boolean {
  const tx1Description = tx1.description || ''
  const tx2Description = tx2.description || ''

  // Check if date, amount, and type match
  if (tx1.date !== tx2.date || tx1.amount !== tx2.amount || tx1.type !== tx2.type) {
    return false
  }

  // Check for name similarity - exact match or substring
  if (tx1Description === tx2Description) {
    return true
  }

  // Check if one name contains the other (for shortened/extended names)
  if (tx1Description.includes(tx2Description) || tx2Description.includes(tx1Description)) {
    return true
  }

  // Check if names are similar using basic string similarity
  const name1 = tx1Description.toLowerCase().replace(/[^a-z0-9]/g, '')
  const name2 = tx2Description.toLowerCase().replace(/[^a-z0-9]/g, '')

  // If one name is contained within the other after normalization
  if (name1.includes(name2) || name2.includes(name1)) {
    return true
  }

  return false
}

export async function findTransactionFiles(directory: string): Promise<string[]> {
  logger.info(`Scanning directory: ${directory}`)
  const files = await fs.readdir(directory)
  const csvFiles = files
    .filter((file) => file.endsWith('.csv') && file.startsWith('transactions-'))
    .sort() // Process files in chronological order

  logger.info(`Found ${csvFiles.length} CSV files to process`)
  return csvFiles
}

export async function findExistingTransaction(tx: TransactionInsert) {
  return await db.query.transactions.findFirst({
    where: and(
      eq(transactions.date, tx.date),
      eq(transactions.amount, tx.amount),
      eq(transactions.type, tx.type),
      tx.accountMask ? eq(transactions.accountMask, tx.accountMask) : undefined
    ),
  })
}

export async function createNewTransaction(tx: TransactionInsert): Promise<Transaction> {
  try {
    const result = await db
      .insert(transactions)
      .values({
        id: crypto.randomUUID(),
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        status: tx.status,
        category: tx.category || '',
        parentCategory: tx.parentCategory || '',
        excluded: tx.excluded,
        tags: tx.tags,
        type: tx.type,
        accountMask: tx.accountMask,
        note: tx.note,
        recurring: tx.recurring || false,
      })
      .returning()

    if (!result || result.length === 0 || !result[0]) {
      throw new Error('Failed to insert transaction')
    }

    return result[0]
  } catch (error) {
    logger.error(`Error inserting transaction: ${JSON.stringify(tx)}`, error)
    throw new Error(
      `Failed to insert transaction: ${error instanceof Error ? error.message : error}`
    )
  }
}

export async function updateTransactionIfNeeded(
  tx: TransactionInsert,
  existingTx: Transaction
): Promise<boolean> {
  const updates: Partial<TransactionInsert> = {}

  // Only update empty or null fields if the new transaction has data
  if ((!existingTx.category || existingTx.category === '') && tx.category) {
    updates.category = tx.category
  }

  if ((!existingTx.parentCategory || existingTx.parentCategory === '') && tx.parentCategory) {
    updates.parentCategory = tx.parentCategory
  }

  if (!existingTx.note && tx.note) {
    updates.note = tx.note
  }

  if (!existingTx.tags && tx.tags) {
    updates.tags = tx.tags
  }

  if (Object.keys(updates).length > 0) {
    try {
      await db.update(transactions).set(updates).where(eq(transactions.id, existingTx.id))
      logger.debug(`Updated transaction ${existingTx.id} with additional metadata`)
      return true
    } catch (error) {
      logger.error(`Failed to update transaction ${existingTx.id}:`, error)
      return false
    }
  }

  return false
}
