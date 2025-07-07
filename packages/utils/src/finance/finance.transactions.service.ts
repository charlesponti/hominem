import { and, asc, desc, eq, gte, like, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@hominem/data/db'
import {
  financeAccounts,
  type FinanceTransaction,
  type FinanceTransactionInsert,
  transactions,
} from '@hominem/data/schema'
import { logger } from '../logger'
import type { QueryOptions } from './finance.types'

/**
 * Builds standardized WHERE conditions for transaction queries.
 *
 * This function provides a centralized way to build database query conditions
 * for financial transactions. It supports:
 *
 * - Fuzzy search for categories (case-insensitive partial matching)
 * - Multiple category filtering (array support)
 * - Date range filtering (supports both legacy and new date formats)
 * - Amount range filtering
 * - Account filtering (UUID or name-based)
 * - Full-text search across multiple fields
 * - Description filtering with fuzzy search
 *
 * @param options - Query options containing filter criteria
 * @returns Combined WHERE conditions or undefined if no conditions
 */
export function buildWhereConditions(options: QueryOptions) {
  const conditions = []

  // User ID filter - required for most operations
  if (options.userId) {
    conditions.push(eq(transactions.userId, options.userId))
  }

  // Transaction type filter
  if (options.type && typeof options.type === 'string') {
    conditions.push(eq(transactions.type, options.type))
  }

  // Default filters to exclude test/invalid transactions
  if (!options.includeExcluded) {
    conditions.push(eq(transactions.excluded, false))
  }

  conditions.push(eq(transactions.pending, false))

  // Date range filters - support both new and legacy format
  const fromDate = options.from ? new Date(options.from) : options.dateFrom
  if (fromDate) {
    conditions.push(gte(transactions.date, fromDate))
  }

  const toDate = options.to ? new Date(options.to) : options.dateTo
  if (toDate) {
    conditions.push(lte(transactions.date, toDate))
  }

  // Category filter with fuzzy search support
  if (options.category) {
    if (Array.isArray(options.category)) {
      // Handle array of categories
      const categoryConditions = options.category.map((cat) => {
        const categoryPattern = `%${cat}%`
        return sql`(${transactions.category} ILIKE ${categoryPattern} OR ${transactions.parentCategory} ILIKE ${categoryPattern})`
      })
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`)
    } else {
      // Handle single category with fuzzy search
      const categoryPattern = `%${options.category}%`
      conditions.push(
        sql`(${transactions.category} ILIKE ${categoryPattern} OR ${transactions.parentCategory} ILIKE ${categoryPattern})`
      )
    }
  }

  // Amount range filters - support both new and legacy format
  const minAmount = options.min ? options.min : options.amountMin?.toString()
  if (minAmount) {
    conditions.push(gte(transactions.amount, minAmount))
  }

  const maxAmount = options.max ? options.max : options.amountMax?.toString()
  if (maxAmount) {
    conditions.push(lte(transactions.amount, maxAmount))
  }

  if (options.account) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        options.account
      )
    if (isUuid) {
      conditions.push(eq(transactions.accountId, options.account))
    } else {
      conditions.push(like(financeAccounts.name, `%${options.account}%`))
    }
  }

  if (options.description) {
    conditions.push(like(transactions.description, `%${options.description}%`))
  }

  if (options.search && typeof options.search === 'string' && options.search.trim() !== '') {
    const searchTerm = options.search.trim()
    const tsVector = sql`to_tsvector('english', 
      coalesce(${transactions.description}, '') || ' ' || 
      coalesce(${transactions.merchantName}, '') || ' ' || 
      coalesce(${transactions.category}, '') || ' ' || 
      coalesce(${transactions.parentCategory}, '') || ' ' || 
      coalesce(${transactions.tags}, '') || ' ' || 
      coalesce(${transactions.note}, '') || ' ' || 
      coalesce(${transactions.paymentChannel}, '') || ' ' || 
      coalesce(${transactions.source}, '')
    )`
    const tsQuery = sql`websearch_to_tsquery('english', ${searchTerm})`
    conditions.push(sql`${tsVector} @@ ${tsQuery}`)
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

export async function queryTransactions(options: QueryOptions) {
  // Ensure sortBy and sortDirection are arrays for consistent handling
  const sortByArray = Array.isArray(options.sortBy)
    ? options.sortBy
    : options.sortBy
      ? [options.sortBy]
      : ['date']
  const sortDirectionArray = Array.isArray(options.sortDirection)
    ? options.sortDirection
    : options.sortDirection
      ? [options.sortDirection]
      : ['desc']

  const { userId, limit = 100, offset = 0 } = options

  if (!userId) {
    return { data: [], filteredCount: 0, totalUserCount: 0 }
  }

  const whereConditions = buildWhereConditions(options)

  const baseFilteredQuery = db
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

  const orderByClauses: SQL[] = []

  for (let i = 0; i < sortByArray.length; i++) {
    const field = sortByArray[i]
    // Ensure sortDirectionArray has a corresponding entry or default to 'desc'
    const direction =
      sortDirectionArray[i] ||
      (sortDirectionArray.length === 1 && i > 0 ? sortDirectionArray[0] : 'desc')

    switch (field) {
      case 'date':
        orderByClauses.push(direction === 'asc' ? asc(transactions.date) : desc(transactions.date))
        break
      case 'amount':
        orderByClauses.push(
          direction === 'asc' ? asc(transactions.amount) : desc(transactions.amount)
        )
        break
      case 'description':
        orderByClauses.push(
          direction === 'asc' ? asc(transactions.description) : desc(transactions.description)
        )
        break
      case 'category':
        orderByClauses.push(
          direction === 'asc' ? asc(transactions.category) : desc(transactions.category)
        )
        break
      // Add other sortable fields here
      default:
        // Optionally log an unrecognized sort field or handle as an error
        logger.warn(`Unrecognized sort field: ${field}`)
        // If it's the first sort field and it's not recognized, apply a default sort to prevent errors
        if (orderByClauses.length === 0) {
          orderByClauses.push(desc(transactions.date))
        }
        break
    }
  }

  // Add a final default sort by ID to ensure stable pagination if 'id' is not already a sort field
  // and to ensure consistent ordering when other sort fields have identical values.
  if (!sortByArray.includes('id')) {
    orderByClauses.push(desc(transactions.id))
  }

  let sortedQuery = baseFilteredQuery
  if (orderByClauses.length > 0) {
    // @ts-expect-error Drizzle's orderBy can take an array of SQL objects
    sortedQuery = baseFilteredQuery.orderBy(...orderByClauses)
  }

  const paginatedTransactions = await sortedQuery.limit(limit).offset(offset)

  // Get count of filtered transactions (for pagination)
  const filteredCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id)) // Join needed if it affects 'whereConditions'
    .where(whereConditions)
  const filteredCount = Number(filteredCountResult[0]?.count || 0)

  // Get total count of transactions for the user (respecting base filters like excluded/pending)
  const totalUserCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.excluded, false),
        eq(transactions.pending, false)
      )
    )
  const totalUserCount = Number(totalUserCountResult[0]?.count || 0)

  return {
    data: paginatedTransactions,
    filteredCount,
    totalUserCount,
  }
}

export function findExistingTransaction(tx: {
  date: Date
  accountMask?: string | null
  amount: string
  type: string
}): Promise<FinanceTransaction | undefined>
export function findExistingTransaction(
  txs: Array<{
    date: Date
    accountMask?: string | null
    amount: string
    type: string
  }>
): Promise<FinanceTransaction[]>
export async function findExistingTransaction(
  txOrTxs:
    | {
        date: Date
        accountMask?: string | null
        amount: string
        type: string
      }
    | Array<{
        date: Date
        accountMask?: string | null
        amount: string
        type: string
      }>
): Promise<FinanceTransaction | FinanceTransaction[] | undefined> {
  if (Array.isArray(txOrTxs)) {
    if (txOrTxs.length === 0) {
      return []
    }
    const conditions = txOrTxs.map((tx) =>
      and(
        eq(transactions.date, tx.date),
        eq(transactions.amount, tx.amount),
        eq(transactions.type, tx.type as FinanceTransaction['type']),
        tx.accountMask ? eq(transactions.accountMask, tx.accountMask) : undefined
      )
    )
    // @ts-expect-error - drizzle-orm `or` supports array of conditions
    return db.query.transactions.findMany({ where: or(...conditions) })
  }
  return db.query.transactions.findFirst({
    where: and(
      eq(transactions.date, txOrTxs.date),
      eq(transactions.amount, txOrTxs.amount),
      eq(transactions.type, txOrTxs.type as FinanceTransaction['type']),
      txOrTxs.accountMask ? eq(transactions.accountMask, txOrTxs.accountMask) : undefined
    ),
  })
}

export function createTransaction(tx: FinanceTransactionInsert): Promise<FinanceTransaction>
export function createTransaction(txs: FinanceTransactionInsert[]): Promise<FinanceTransaction[]>
export async function createTransaction(
  txOrTxs: FinanceTransactionInsert | FinanceTransactionInsert[]
): Promise<FinanceTransaction | FinanceTransaction[]> {
  try {
    const transactionsToInsert = Array.isArray(txOrTxs) ? txOrTxs : [txOrTxs]
    if (transactionsToInsert.length === 0) {
      return []
    }

    const values = transactionsToInsert.map((tx) => ({
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
    }))

    const result = await db.insert(transactions).values(values).returning()

    if (!result || result.length === 0) {
      throw new Error('Failed to insert transaction(s)')
    }

    return Array.isArray(txOrTxs) ? result : result[0]!
  } catch (error) {
    logger.error(`Error inserting transaction(s): ${JSON.stringify(txOrTxs)}`, error)
    throw new Error(
      `Failed to insert transaction(s): ${error instanceof Error ? error.message : error}`
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
