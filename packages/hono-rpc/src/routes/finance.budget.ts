import {
  getAllBudgetCategories,
  getBudgetCategoriesWithSpending,
  getBudgetCategoryById,
  createBudgetCategory,
  checkBudgetCategoryNameExists,
  updateBudgetCategory,
  deleteBudgetCategory,
  getBudgetTrackingData,
  getUserExpenseCategories,
  summarizeByMonth,
  getTransactionCategoriesAnalysis,
  bulkCreateBudgetCategoriesFromTransactions,
} from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Budget Routes
 *
 * Handles all budget-related operations:
 * - POST /categories/list - List budget categories
 * - POST /categories/list-with-spending - List with spending data
 * - POST /categories/get - Get single category
 * - POST /categories/create - Create category
 * - POST /categories/update - Update category
 * - POST /categories/delete - Delete category
 * - POST /tracking - Get budget tracking data
 * - POST /history - Get budget history
 * - POST /calculate - Calculate personal budget
 * - POST /transaction-categories - Get transaction categories
 * - POST /bulk-create - Bulk create from transactions
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const categoriesListWithSpendingSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Month year must be in YYYY-MM format'),
});

const categoryGetSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense'], {
    message: "Type must be 'income' or 'expense'",
  }),
  averageMonthlyExpense: z.string().optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
  color: z.string().optional(),
});

const categoryUpdateSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  name: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  averageMonthlyExpense: z.string().optional(),
  budgetId: z.uuid().optional(),
  color: z.string().optional(),
});

const categoryDeleteSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const trackingSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Month year must be in YYYY-MM format'),
});

const historySchema = z.object({
  months: z.number().int().min(1).max(60).optional().default(12),
});

const calculateSchema = z
  .object({
    income: z.number().positive(),
    expenses: z.array(
      z.object({
        category: z.string(),
        amount: z.number().positive(),
      }),
    ),
  })
  .optional();

const bulkCreateSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      type: z.enum(['income', 'expense'], {
        message: "Type must be 'income' or 'expense'",
      }),
      averageMonthlyExpense: z.string().optional(),
      color: z.string().optional(),
    }),
  ),
});

// ============================================================================
// Routes
// ============================================================================

export const budgetRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /categories/list - List categories
  .post('/categories/list', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getAllBudgetCategories(userId);
      return c.json(result);
    } catch (error) {
      console.error('Error listing budget categories:', error);
      throw new Error('Failed to list budget categories');
    }
  })

  // POST /categories/list-with-spending - List with spending
  .post(
    '/categories/list-with-spending',
    zValidator('json', categoriesListWithSpendingSchema),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      try {
        const result = await getBudgetCategoriesWithSpending({
          userId,
          monthYear: input.monthYear,
        });
        return c.json(result);
      } catch (error) {
        console.error('Error listing categories with spending:', error);
        throw new Error('Failed to list categories with spending');
      }
    },
  )

  // POST /categories/get - Get category
  .post('/categories/get', zValidator('json', categoryGetSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getBudgetCategoryById(input.id, userId);
      return c.json(result);
    } catch (error) {
      console.error('Error getting budget category:', error);
      throw new Error('Failed to get budget category');
    }
  })

  // POST /categories/create - Create category
  .post('/categories/create', zValidator('json', categoryCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const existingCategory = await checkBudgetCategoryNameExists(input.name, userId);
      if (existingCategory) {
        throw new Error(`A budget category named "${input.name}" already exists for this user`);
      }

      const result = await createBudgetCategory({
        ...input,
        userId,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error creating budget category:', error);
      throw new Error('Failed to create budget category');
    }
  })

  // POST /categories/update - Update category
  .post('/categories/update', zValidator('json', categoryUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const { id, ...updateData } = input;

    try {
      if (Object.keys(updateData).length === 0) {
        throw new Error('No update data provided');
      }

      const result = await updateBudgetCategory(id, userId, updateData);
      return c.json(result);
    } catch (error) {
      console.error('Error updating budget category:', error);
      throw new Error('Failed to update budget category');
    }
  })

  // POST /categories/delete - Delete category
  .post('/categories/delete', zValidator('json', categoryDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      await deleteBudgetCategory(input.id, userId);

      return c.json({
        success: true,
        message: 'Budget category deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting budget category:', error);
      throw new Error('Failed to delete budget category');
    }
  })

  // POST /tracking - Get tracking data
  .post('/tracking', zValidator('json', trackingSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await getBudgetTrackingData({
        userId,
        monthYear: input.monthYear,
      });
      return c.json(result);
    } catch (error) {
      console.error('Error getting budget tracking:', error);
      throw new Error('Failed to get budget tracking');
    }
  })

  // POST /history - Get budget history
  .post('/history', zValidator('json', historySchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const userExpenseCategories = await getUserExpenseCategories(userId);

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum: number, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0,
      );

      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startDate = new Date(today.getFullYear(), today.getMonth() - (input.months - 1), 1);

      const allMonthlySummaries = await summarizeByMonth({
        userId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });

      const actualsMap = new Map<string, number>();
      for (const summary of allMonthlySummaries) {
        if (summary.month && summary.expenses) {
          actualsMap.set(summary.month, Number.parseFloat(summary.expenses));
        }
      }

      const results = [];
      for (let i = 0; i < input.months; i++) {
        const targetIterationDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = targetIterationDate.getFullYear();
        const monthNum = targetIterationDate.getMonth();
        const monthKey = `${year}-${(monthNum + 1).toString().padStart(2, '0')}`;

        const displayMonth = targetIterationDate.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        });
        const actualSpending = actualsMap.get(monthKey) || 0;

        results.push({
          date: displayMonth,
          budgeted: totalMonthlyBudget,
          actual: actualSpending,
        });
      }

      return c.json(results.reverse());
    } catch (error) {
      console.error('Error getting budget history:', error);
      throw new Error('Failed to get budget history');
    }
  })

  // POST /calculate - Calculate personal budget
  .post('/calculate', zValidator('json', calculateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      // If manual data is provided, use it directly
      if (input) {
        const totalExpenses = input.expenses.reduce(
          (sum: number, expense) => sum + expense.amount,
          0,
        );
        const surplus = input.income - totalExpenses;
        const savingsRate = ((input.income - totalExpenses) / input.income) * 100;

        const categories = input.expenses.map((expense) => ({
          ...expense,
          percentage: (expense.amount / input.income) * 100,
        }));

        const projections = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          savings: surplus * (i + 1),
          totalSaved: surplus * (i + 1),
        }));

        return c.json({
          income: input.income,
          totalExpenses,
          surplus,
          savingsRate,
          categories,
          projections,
          calculatedAt: new Date().toISOString(),
          source: 'manual' as const,
        });
      }

      // Otherwise, use user's budget categories
      const userCategories = await getAllBudgetCategories(userId);

      if (userCategories.length === 0) {
        throw new Error(
          'No budget categories found. Please create categories first or provide manual data.',
        );
      }

      const income = userCategories
        .filter((cat) => cat.type === 'income')
        .reduce((sum: number, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0);

      const expenses = userCategories
        .filter((cat) => cat.type === 'expense')
        .map((cat) => ({
          category: cat.name,
          amount: Number.parseFloat(cat.averageMonthlyExpense || '0'),
        }));

      if (income <= 0) {
        throw new Error('No income categories found. Please add income categories first.');
      }

      const totalExpenses = expenses.reduce((sum: number, expense) => sum + expense.amount, 0);
      const surplus = income - totalExpenses;
      const savingsRate = ((income - totalExpenses) / income) * 100;

      const categories = expenses.map((expense) => ({
        ...expense,
        percentage: (expense.amount / income) * 100,
      }));

      const projections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        savings: surplus * (i + 1),
        totalSaved: surplus * (i + 1),
      }));

      return c.json({
        income,
        totalExpenses,
        surplus,
        savingsRate,
        categories,
        projections,
        calculatedAt: new Date().toISOString(),
        source: 'categories' as const,
      });
    } catch (error) {
      console.error('Error calculating budget:', error);
      throw new Error('Failed to calculate budget');
    }
  })

  // POST /transaction-categories - Get transaction categories
  .post('/transaction-categories', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getTransactionCategoriesAnalysis(userId);
      return c.json(result);
    } catch (error) {
      console.error('Error getting transaction categories:', error);
      throw new Error('Failed to get transaction categories');
    }
  })

  // POST /bulk-create - Bulk create from transactions
  .post('/bulk-create', zValidator('json', bulkCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await bulkCreateBudgetCategoriesFromTransactions(userId, input.categories);
      return c.json(result);
    } catch (error) {
      console.error('Error bulk creating categories:', error);
      throw new Error('Failed to bulk create categories');
    }
  });
