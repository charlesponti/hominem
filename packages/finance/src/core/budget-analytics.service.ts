import { db } from '@hominem/db';
import { budgetCategories, transactions } from '@hominem/db/schema/finance';
import { logger } from '@hominem/utils/logger';
import { and, eq, gte, inArray, sql } from '@hominem/db';
import crypto from 'node:crypto';

/**
 * Get transaction categories analysis
 */
export async function getTransactionCategoriesAnalysis(userId: string) {
  try {
    // First, get the current date and calculate 6 months ago
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();

    // Get categories that have transactions in each of the last 6 months
    const recentTransactionCategories = await db
      .select({
        category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`.as('category'),
        month: sql<string>`DATE_TRUNC('month', ${transactions.date})`.as('month'),
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, sixMonthsAgo)))
      .groupBy(
        sql`COALESCE(${transactions.category}, 'Uncategorized')`,
        sql`DATE_TRUNC('month', ${transactions.date})`,
      );

    // Count how many months each category appears in
    const categoryMonthCounts = new Map<string, number>();
    recentTransactionCategories.forEach((row) => {
      if (row.category && row.category !== 'Uncategorized' && row.category.trim() !== '') {
        const currentCount = categoryMonthCounts.get(row.category) || 0;
        categoryMonthCounts.set(row.category, currentCount + 1);
      }
    });

    // Only include categories that appear in all 6 months (or at least 5 out of 6 for flexibility)
    const consistentCategories = Array.from(categoryMonthCounts.entries())
      .filter(([_, monthCount]) => monthCount >= 5)
      .map(([category]) => category);

    if (consistentCategories.length === 0) {
      return [];
    }

    // Now get the detailed analysis for only the consistent categories
    const transactionCategories = await db
      .select({
        category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`.as('category'),
        count: sql<number>`COUNT(*)`.as('count'),
        totalAmount: sql<number>`SUM(${transactions.amount})`.as('totalAmount'),
        avgAmount: sql<number>`AVG(${transactions.amount})`.as('avgAmount'),
        // Calculate the number of months this category has transactions (should be 6 for consistent categories)
        monthsWithTransactions:
          sql<number>`COUNT(DISTINCT DATE_TRUNC('month', ${transactions.date}))`.as(
            'monthsWithTransactions',
          ),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, sixMonthsAgo),
          inArray(transactions.category, consistentCategories),
        ),
      )
      .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
      .orderBy(sql`COUNT(*) DESC`);

    // Format the response
    const categories = transactionCategories
      .filter(
        (row) => row.category && row.category !== 'Uncategorized' && row.category.trim() !== '',
      )
      .map((row) => {
        const totalAmount = Number.parseFloat(row.totalAmount.toString());
        const monthsWithTransactions = Number.parseFloat(row.monthsWithTransactions.toString());

        // Calculate monthly average: total amount / number of months with transactions
        // For consistent categories, this should be 6 months
        const suggestedBudget =
          monthsWithTransactions > 0
            ? Math.abs(totalAmount / monthsWithTransactions)
            : Math.abs(Number.parseFloat(row.avgAmount.toString()));

        return {
          name: row.category,
          transactionCount: row.count,
          totalAmount: totalAmount,
          averageAmount: Number.parseFloat(row.avgAmount.toString()),
          suggestedBudget: suggestedBudget,
          monthsWithTransactions: monthsWithTransactions,
        };
      });

    return categories;
  } catch (error) {
    logger.error(`Error fetching transaction categories analysis for user ${userId}:`, { error });
    throw error;
  }
}

/**
 * Bulk create budget categories from transaction data
 */
export async function bulkCreateBudgetCategoriesFromTransactions(
  userId: string,
  categories: Array<{
    name: string;
    type: 'income' | 'expense';
    averageMonthlyExpense?: string;
    color?: string;
  }>,
) {
  try {
    if (categories.length === 0) {
      throw new Error('No categories provided');
    }

    // Get existing budget category names for this user
    const existingCategories = await db
      .select({ name: budgetCategories.name })
      .from(budgetCategories)
      .where(eq(budgetCategories.userId, userId));

    const existingNames = new Set(existingCategories.map((cat) => cat.name.toLowerCase()));

    // Filter out categories that already exist (case-insensitive comparison)
    const newCategories = categories.filter((cat) => !existingNames.has(cat.name.toLowerCase()));

    if (newCategories.length === 0) {
      return {
        success: true,
        message: 'All categories already exist',
        categories: [],
        skipped: categories.length,
      };
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
          color: cat.color || null,
          userId,
        })),
      )
      .returning();

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
    };
  } catch (error) {
    logger.error(`Error bulk creating budget categories for user ${userId}:`, { error });
    throw error;
  }
}
