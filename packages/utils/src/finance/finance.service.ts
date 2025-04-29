import { and, eq, gte, like, lte, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../db/index'
import {
  financeAccounts,
  transactions,
  type FinanceTransaction,
  type FinanceTransactionInsert,
} from '../db/schema/finance.schema'
import type { Possession } from '../db/schema/possessions.schema'
import { logger } from '../logger'
import type { CategoryAggregate, CategorySummary, QueryOptions, TopMerchant } from './types'

export interface ItemCategory {
  id: number
  name: string
  userId: number
  parentId: number | null
}

/**
 * # Cost per Time
 *
 * ## Description
 * Determine how much an item costs of a user's time in minutes, hours, days, and years.
 *
 * ## Steps
 *  2. Get user's annual salary
 *  4. Determine user's hourly rate
 *  3. Get price of item
 *  5. Determine how much of a user's time is required to purchase the item
 */
export function calculateCostPerTimeUnit(item: Possession): number {
  return +(item.purchasePrice / 3 / 365).toPrecision(4)
}

/**
 * Parses the amount to a number.
 */
export function parseAmount(amount: string | number): number {
  return typeof amount === 'string' ? Number.parseFloat(amount) : amount
}

export function buildWhereConditions(options: QueryOptions) {
  const conditions = []

  if (!options.userId) return undefined
  conditions.push(eq(transactions.userId, options.userId))

  // Only filter by transaction type if specified in options
  if (options.type && typeof options.type === 'string') {
    conditions.push(eq(transactions.type, options.type))
  }

  conditions.push(eq(transactions.excluded, false))
  conditions.push(eq(transactions.pending, false))

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

  if (options.description) {
    conditions.push(like(transactions.description, `%${options.description}%`))
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function queryTransactions(options: QueryOptions) {
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
      accountId: transactions.accountId,
      account: financeAccounts,
    })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
    .where(whereConditions)
    .orderBy(sql`${transactions.date} DESC`)
    .limit(limit)

  return result
}

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

export async function summarizeByMonth(options: QueryOptions) {
  // Build minimal WHERE conditions directly to avoid default filters
  const conditions = []
  if (options.userId) {
    conditions.push(eq(transactions.userId, options.userId))
  }
  if (options.from) {
    conditions.push(gte(transactions.date, new Date(options.from)))
  }
  if (options.to) {
    conditions.push(lte(transactions.date, new Date(options.to)))
  }
  const whereConditions = conditions.length > 0 ? and(...conditions) : undefined

  const result = await db
    .select({
      month: sql<string>`SUBSTR(${transactions.date}::text, 1, 7)`,
      count: sql<number>`COUNT(*)`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount}::numeric ELSE 0 END)`,
      expenses: sql<number>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount}::numeric ELSE 0 END)`,
      average: sql<number>`AVG(${transactions.amount}::numeric)`,
    })
    .from(transactions)
    .where(whereConditions)
    .groupBy(sql`SUBSTR(${transactions.date}::text, 1, 7)`)
    .orderBy(sql`SUBSTR(${transactions.date}::text, 1, 7) DESC`)

  // Format the numeric values
  return result
    .map((row) => ({
      month: row.month,
      count: row.count,
      income: Number.parseFloat(row.income?.toString() || '0').toFixed(2),
      expenses: Number.parseFloat(row.expenses?.toString() || '0').toFixed(2),
      average: Number.parseFloat(row.average?.toString() || '0').toFixed(2),
    }))
    .sort((a, b) => {
      const dateA = new Date(a.month)
      const dateB = new Date(b.month)

      return dateB.getTime() - dateA.getTime() // Descending order
    })
}

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

export async function findExistingTransaction(tx: {
  date: Date
  accountMask?: string | null
  amount: string
  type: string
}) {
  return await db.query.transactions.findFirst({
    where: and(
      eq(transactions.date, tx.date),
      eq(transactions.amount, tx.amount),
      eq(transactions.type, tx.type as FinanceTransactionInsert['type']),
      tx.accountMask ? eq(transactions.accountMask, tx.accountMask) : undefined
    ),
  })
}

export async function createNewTransaction(
  tx: FinanceTransactionInsert
): Promise<FinanceTransaction> {
  try {
    const result = await db
      .insert(transactions)
      .values({
        id: crypto.randomUUID(),
        accountId: tx.accountId,
        accountMask: tx.accountMask,
        amount: tx.amount,
        category: tx.category || '',
        date: tx.date,
        description: tx.description,
        excluded: tx.excluded,
        note: tx.note,
        parentCategory: tx.parentCategory || '',
        recurring: tx.recurring || false,
        status: tx.status,
        tags: tx.tags,
        type: tx.type,
        userId: tx.userId,
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
  tx: FinanceTransactionInsert,
  existingTx: FinanceTransaction
): Promise<boolean> {
  const updates: Partial<FinanceTransactionInsert> = {}

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

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<FinanceTransactionInsert>
): Promise<FinanceTransaction> {
  try {
    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error(`Transaction not found or not updated: ${transactionId}`)
    }

    return updated
  } catch (error) {
    logger.error(`Error updating transaction ${transactionId}:`, error)
    throw error
  }
}

export async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  try {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
  } catch (error) {
    logger.error(`Error deleting transaction ${transactionId}:`, error)
    throw error
  }
}
