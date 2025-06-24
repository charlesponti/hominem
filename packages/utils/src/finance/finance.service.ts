import { and, asc, desc, eq, gte, like, lte, sql, type SQL } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../db/index'
import {
  budgetCategories,
  budgetGoals,
  financeAccounts,
  financialInstitutions,
  plaidItems,
  transactions,
  type FinanceTransaction,
  type FinanceTransactionInsert,
} from '../db/schema/finance.schema'
import type { Possession } from '../db/schema/possessions.schema'
import { logger } from '../logger'
import type { CategoryAggregate, CategorySummary, QueryOptions, TopMerchant } from './finance.types'

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
  const totalUserBaseConditions = and(
    eq(transactions.userId, userId),
    eq(transactions.excluded, false),
    eq(transactions.pending, false)
  )
  const totalUserCountResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .where(totalUserBaseConditions)
  const totalUserCount = Number(totalUserCountResult[0]?.count || 0)

  return {
    data: paginatedTransactions,
    filteredCount,
    totalUserCount,
  }
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

export async function getBudgetCategories(options: { userId: string }) {
  if (!options.userId) {
    throw new Error('User ID is required to fetch budget categories.')
  }

  const categories = await db
    .select()
    .from(budgetCategories)
    .where(eq(budgetCategories.userId, options.userId))
    .orderBy(budgetCategories.name)

  return categories
}

export async function getBudgetCategorySuggestions(options: {
  userId: string
  description: string
  amount?: number
}) {
  if (!options.userId) {
    throw new Error('User ID is required to get budget category suggestions.')
  }

  // Basic suggestion logic: Find categories from past transactions with similar descriptions
  const similarTransactions = await db
    .selectDistinct({ category: transactions.category })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, options.userId),
        like(transactions.description, `%${options.description}%`),
        transactions.category // Ensure category is not null or empty
      )
    )
    .limit(5)

  const suggestions = similarTransactions.map((tx) => tx.category).filter(Boolean) as string[]

  // Fallback or additional suggestions (could be expanded)
  if (suggestions.length === 0) {
    if (options.amount && options.amount > 0) {
      suggestions.push('Income') // Suggest 'Income' for positive amounts
    } else {
      suggestions.push('Miscellaneous') // Default suggestion
    }
  }

  // You could add more sophisticated logic here, e.g., using ML or keyword mapping
  return { suggestions: [...new Set(suggestions)] }
}

/**
 * Get all financial institutions
 */
export async function getFinancialInstitutions() {
  try {
    return await db.query.financialInstitutions.findMany({
      orderBy: [financialInstitutions.name],
    })
  } catch (error) {
    logger.error('Error fetching financial institutions:', error)
    throw error
  }
}

/**
 * Get spending categories for a user
 */
export async function getSpendingCategories(userId: string) {
  try {
    return await db
      .select({
        category: transactions.category,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')))
      .groupBy(transactions.category)
      .orderBy(transactions.category)
  } catch (error) {
    logger.error('Error fetching spending categories:', error)
    throw error
  }
}

/**
 * Delete all finance data for a user
 */
export async function deleteAllFinanceData(userId: string) {
  try {
    // Delete all finance-related data for the user
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(financeAccounts).where(eq(financeAccounts.userId, userId))
    await db.delete(budgetGoals).where(eq(budgetGoals.userId, userId))
    await db.delete(budgetCategories).where(eq(budgetCategories.userId, userId))
    await db.delete(plaidItems).where(eq(plaidItems.userId, userId))

    logger.info(`Deleted all finance data for user ${userId}`)
  } catch (error) {
    logger.error(`Error deleting finance data for user ${userId}:`, error)
    throw error
  }
}
