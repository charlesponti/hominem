import crypto from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db } from '../../db'
import { budgetGoals } from '../../db/schema'
import { logger } from '../../logger'

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
    logger.error(`Error fetching budget goals for user ${userId}:`, { error })
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
    logger.error('Error creating budget goal:', { error })
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
    logger.error(`Error updating budget goal ${goalId}:`, { error })
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
    logger.error(`Error deleting budget goal ${goalId}:`, { error })
    throw error
  }
}
