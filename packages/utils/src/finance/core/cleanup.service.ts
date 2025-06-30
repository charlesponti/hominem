import { eq } from 'drizzle-orm'
import { db } from '../../db/index'
import {
  budgetGoals,
  financeAccounts,
  plaidItems,
  transactions,
} from '../../db/schema/finance.schema'
import { logger } from '../../logger'

/**
 * Delete all finance data for a user
 * This includes transactions, accounts, budget goals, and plaid items
 */
export async function deleteAllFinanceData(userId: string) {
  try {
    // Delete all finance-related data for the user
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(financeAccounts).where(eq(financeAccounts.userId, userId))
    await db.delete(budgetGoals).where(eq(budgetGoals.userId, userId))
    await db.delete(plaidItems).where(eq(plaidItems.userId, userId))

    logger.info(`Deleted all finance data for user ${userId}`)
  } catch (error) {
    logger.error(`Error deleting finance data for user ${userId}:`, error)
    throw error
  }
}
