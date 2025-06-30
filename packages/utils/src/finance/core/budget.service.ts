import { and, eq, like, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../../db/index'
import { budgetCategories, budgetGoals, transactions } from '../../db/schema/finance.schema'
import { logger } from '../../logger'

/**
 * Get budget categories for a user
 */
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

/**
 * Get budget category suggestions based on transaction description
 */
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
 * Create a new budget category
 */
export async function createBudgetCategory(data: {
  userId: string
  name: string
  type?: string
  budgetId?: string
  averageMonthlyExpense?: string
}) {
  try {
    const [category] = await db
      .insert(budgetCategories)
      .values({
        id: crypto.randomUUID(),
        userId: data.userId,
        name: data.name,
        type: data.type || 'expense',
        budgetId: data.budgetId || null,
        averageMonthlyExpense: data.averageMonthlyExpense || null,
      })
      .returning()

    return category
  } catch (error) {
    logger.error('Error creating budget category:', error)
    throw error
  }
}

/**
 * Update a budget category
 */
export async function updateBudgetCategory(
  categoryId: string,
  userId: string,
  updates: Partial<{
    name: string
    type: string
    budgetId: string | null
    averageMonthlyExpense: string | null
  }>
) {
  try {
    const [updated] = await db
      .update(budgetCategories)
      .set(updates)
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error(`Budget category not found or not updated: ${categoryId}`)
    }

    return updated
  } catch (error) {
    logger.error(`Error updating budget category ${categoryId}:`, error)
    throw error
  }
}

/**
 * Delete a budget category
 */
export async function deleteBudgetCategory(categoryId: string, userId: string): Promise<void> {
  try {
    await db
      .delete(budgetCategories)
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.userId, userId)))
  } catch (error) {
    logger.error(`Error deleting budget category ${categoryId}:`, error)
    throw error
  }
}

/**
 * Get budget goals for a user
 */
export async function getBudgetGoals(userId: string) {
  try {
    return await db
      .select()
      .from(budgetGoals)
      .where(eq(budgetGoals.userId, userId))
      .orderBy(budgetGoals.startDate)
  } catch (error) {
    logger.error(`Error fetching budget goals for user ${userId}:`, error)
    throw error
  }
}

/**
 * Create a new budget goal
 */
export async function createBudgetGoal(data: {
  userId: string
  name: string
  targetAmount: string
  currentAmount?: string
  startDate: Date
  endDate?: Date | null
  categoryId?: string | null
}) {
  try {
    const [goal] = await db
      .insert(budgetGoals)
      .values({
        id: crypto.randomUUID(),
        userId: data.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount || '0',
        startDate: data.startDate,
        endDate: data.endDate || null,
        categoryId: data.categoryId || null,
      })
      .returning()

    return goal
  } catch (error) {
    logger.error('Error creating budget goal:', error)
    throw error
  }
}

/**
 * Update a budget goal
 */
export async function updateBudgetGoal(
  goalId: string,
  userId: string,
  updates: Partial<{
    name: string
    targetAmount: string
    currentAmount: string
    startDate: Date
    endDate: Date | null
    categoryId: string | null
  }>
) {
  try {
    const [updated] = await db
      .update(budgetGoals)
      .set(updates)
      .where(and(eq(budgetGoals.id, goalId), eq(budgetGoals.userId, userId)))
      .returning()

    if (!updated) {
      throw new Error(`Budget goal not found or not updated: ${goalId}`)
    }

    return updated
  } catch (error) {
    logger.error(`Error updating budget goal ${goalId}:`, error)
    throw error
  }
}

/**
 * Delete a budget goal
 */
export async function deleteBudgetGoal(goalId: string, userId: string): Promise<void> {
  try {
    await db
      .delete(budgetGoals)
      .where(and(eq(budgetGoals.id, goalId), eq(budgetGoals.userId, userId)))
  } catch (error) {
    logger.error(`Error deleting budget goal ${goalId}:`, error)
    throw error
  }
}

/**
 * Get a specific budget category by ID
 */
export async function getBudgetCategoryById(categoryId: string, userId: string) {
  try {
    const category = await db
      .select()
      .from(budgetCategories)
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.userId, userId)))
      .limit(1)

    if (category.length === 0) {
      throw new Error('Budget category not found')
    }

    return category[0]
  } catch (error) {
    logger.error(`Error fetching budget category ${categoryId}:`, error)
    throw error
  }
}

/**
 * Check if a budget category name already exists for a user
 */
export async function checkBudgetCategoryNameExists(
  name: string,
  userId: string
): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: budgetCategories.id })
      .from(budgetCategories)
      .where(and(eq(budgetCategories.name, name), eq(budgetCategories.userId, userId)))
      .limit(1)

    return existing.length > 0
  } catch (error) {
    logger.error('Error checking budget category name existence:', error)
    throw error
  }
}

/**
 * Get user's expense categories for budget history
 */
export async function getUserExpenseCategories(userId: string) {
  try {
    return await db
      .select()
      .from(budgetCategories)
      .where(and(eq(budgetCategories.userId, userId), eq(budgetCategories.type, 'expense')))
      .orderBy(budgetCategories.name)
  } catch (error) {
    logger.error(`Error fetching expense categories for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get all budget categories for a user (ordered by name)
 */
export async function getAllBudgetCategories(userId: string) {
  try {
    return await db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.userId, userId))
      .orderBy(budgetCategories.name)
  } catch (error) {
    logger.error(`Error fetching all budget categories for user ${userId}:`, error)
    throw error
  }
}

/**
 * Get transaction categories analysis
 */
export async function getTransactionCategoriesAnalysis(userId: string) {
  try {
    const transactionCategories = await db
      .select({
        category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(${transactions.amount})`,
        avgAmount: sql<number>`AVG(${transactions.amount})`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
      .orderBy(sql`COUNT(*) DESC`)

    // Filter out empty/null categories and format the response
    const categories = transactionCategories
      .filter(
        (row) => row.category && row.category !== 'Uncategorized' && row.category.trim() !== ''
      )
      .map((row) => ({
        name: row.category,
        transactionCount: row.count,
        totalAmount: Number.parseFloat(row.totalAmount.toString()),
        averageAmount: Number.parseFloat(row.avgAmount.toString()),
        suggestedBudget: Math.abs(Number.parseFloat(row.avgAmount.toString()) * 12), // Monthly average * 12
      }))

    return categories
  } catch (error) {
    logger.error(`Error fetching transaction categories analysis for user ${userId}:`, error)
    throw error
  }
}

/**
 * Bulk create budget categories from transaction data
 */
export async function bulkCreateBudgetCategoriesFromTransactions(
  userId: string,
  categories: Array<{
    name: string
    type: 'income' | 'expense'
    averageMonthlyExpense?: string
  }>
) {
  try {
    if (categories.length === 0) {
      throw new Error('No categories provided')
    }

    // Get existing budget category names for this user
    const existingCategories = await db
      .select({ name: budgetCategories.name })
      .from(budgetCategories)
      .where(eq(budgetCategories.userId, userId))

    const existingNames = new Set(existingCategories.map((cat) => cat.name.toLowerCase()))

    // Filter out categories that already exist (case-insensitive comparison)
    const newCategories = categories.filter((cat) => !existingNames.has(cat.name.toLowerCase()))

    if (newCategories.length === 0) {
      return {
        success: true,
        message: 'All categories already exist',
        categories: [],
        skipped: categories.length,
      }
    }

    // Create only the new categories
    const createdCategories = await db
      .insert(budgetCategories)
      .values(
        newCategories.map((cat) => ({
          id: crypto.randomUUID(),
          name: cat.name,
          type: cat.type,
          averageMonthlyExpense: cat.averageMonthlyExpense || '0',
          userId,
        }))
      )
      .returning()

    return {
      success: true,
      message: `Created ${createdCategories.length} new budget categories${
        categories.length - newCategories.length > 0
          ? `, skipped ${categories.length - newCategories.length} existing categories`
          : ''
      }`,
      categories: createdCategories,
      created: createdCategories.length,
      skipped: categories.length - newCategories.length,
    }
  } catch (error) {
    logger.error(`Error bulk creating budget categories for user ${userId}:`, error)
    throw error
  }
}
