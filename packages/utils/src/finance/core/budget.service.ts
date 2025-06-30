import { and, eq, like } from 'drizzle-orm'
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
