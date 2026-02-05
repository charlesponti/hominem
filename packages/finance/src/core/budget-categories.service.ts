import { db } from '@hominem/db';
import { budgetCategories, transactions } from '@hominem/db/schema/finance';
import { logger } from '@hominem/utils/logger';
import { and, eq, like } from '@hominem/db';
import crypto from 'node:crypto';

export type BudgetCategoryType = (typeof budgetCategories.type.enumValues)[number];

/**
 * Get budget categories for a user
 */
export async function getBudgetCategories(options: {
  userId: string;
  name?: string | undefined;
  type?: BudgetCategoryType | undefined;
}) {
  if (!options.userId) {
    throw new Error('User ID is required to fetch budget categories.');
  }

  const categoryType =
    options.type && budgetCategories.type.enumValues.includes(options.type)
      ? options.type
      : undefined;

  if (options.type && !categoryType) {
    throw new Error(`Invalid budget category type: ${options.type}`);
  }

  const categories = await db
    .select()
    .from(budgetCategories)
    .where(
      and(
        eq(budgetCategories.userId, options.userId),
        options.name ? like(budgetCategories.name, `%${options.name}%`) : undefined,
        categoryType ? eq(budgetCategories.type, categoryType) : undefined,
      ),
    )
    .orderBy(budgetCategories.name);

  return categories;
}

/**
 * Get budget category suggestions based on transaction description
 */
export async function getBudgetCategorySuggestions(options: {
  userId: string;
  description: string;
  amount?: number;
}) {
  if (!options.userId) {
    throw new Error('User ID is required to get budget category suggestions.');
  }

  // Basic suggestion logic: Find categories from past transactions with similar descriptions
  const similarTransactions = await db
    .selectDistinct({ category: transactions.category })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, options.userId),
        like(transactions.description, `%${options.description}%`),
        transactions.category, // Ensure category is not null or empty
      ),
    )
    .limit(5);

  const suggestions = similarTransactions.map((tx) => tx.category).filter(Boolean) as string[];

  // Fallback or additional suggestions (could be expanded)
  if (suggestions.length === 0) {
    if (options.amount && options.amount > 0) {
      suggestions.push('Income'); // Suggest 'Income' for positive amounts
    } else {
      suggestions.push('Miscellaneous'); // Default suggestion
    }
  }

  // You could add more sophisticated logic here, e.g., using ML or keyword mapping
  return { suggestions: [...new Set(suggestions)] };
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
      .orderBy(transactions.category);
  } catch (error) {
    logger.error('Error fetching spending categories:', { error });
    throw error;
  }
}

/**
 * Create a new budget category
 */
export async function createBudgetCategory(data: {
  userId: string;
  name: string;
  type?: 'income' | 'expense';
  budgetId?: string;
  averageMonthlyExpense?: string;
  color?: string;
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
        color: data.color || null,
      })
      .returning();

    return category;
  } catch (error) {
    logger.error('Error creating budget category:', { error });
    throw error;
  }
}

/**
 * Update a budget category
 */
export async function updateBudgetCategory(
  categoryId: string,
  userId: string,
  updates: Partial<{
    name: string;
    type: 'income' | 'expense';
    budgetId: string | null;
    averageMonthlyExpense: string | null;
    color: string | null;
  }>,
) {
  try {
    const [updated] = await db
      .update(budgetCategories)
      .set(updates)
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Budget category not found or not updated: ${categoryId}`);
    }

    return updated;
  } catch (error) {
    logger.error(`Error updating budget category ${categoryId}:`, { error });
    throw error;
  }
}

/**
 * Delete a budget category
 */
export async function deleteBudgetCategory(categoryId: string, userId: string): Promise<void> {
  try {
    await db
      .delete(budgetCategories)
      .where(and(eq(budgetCategories.id, categoryId), eq(budgetCategories.userId, userId)));
  } catch (error) {
    logger.error(`Error deleting budget category ${categoryId}:`, { error });
    throw error;
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
      .limit(1);

    if (category.length === 0) {
      throw new Error('Budget category not found');
    }

    return category[0];
  } catch (error) {
    logger.error(`Error fetching budget category ${categoryId}:`, { error });
    throw error;
  }
}

/**
 * Check if a budget category name already exists for a user
 */
export async function checkBudgetCategoryNameExists(
  name: string,
  userId: string,
): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: budgetCategories.id })
      .from(budgetCategories)
      .where(and(eq(budgetCategories.name, name), eq(budgetCategories.userId, userId)))
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    logger.error('Error checking budget category name existence:', { error });
    throw error;
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
      .orderBy(budgetCategories.name);
  } catch (error) {
    logger.error(`Error fetching expense categories for user ${userId}:`, { error });
    throw error;
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
      .orderBy(budgetCategories.name);
  } catch (error) {
    logger.error(`Error fetching all budget categories for user ${userId}:`, { error });
    throw error;
  }
}
