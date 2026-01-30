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
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalError,
  isServiceError,
} from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  type BudgetCategoryData,
  type BudgetCategoriesListOutput,
  type BudgetCategoriesListWithSpendingOutput,
  type BudgetCategoryGetOutput,
  type BudgetCategoryCreateOutput,
  type BudgetCategoryUpdateOutput,
  type BudgetCategoryDeleteOutput,
  type BudgetTrackingOutput,
  type BudgetHistoryOutput,
  type BudgetCalculateOutput,
  type BudgetBulkCreateOutput,
  type TransactionCategoryAnalysisOutput,
} from '../types/finance.types';

/**
 * Serialization Helpers
 */
function serializeBudgetCategory(cat: any): BudgetCategoryData {
  return {
    ...cat,
    createdAt: typeof cat.createdAt === 'string' ? cat.createdAt : cat.createdAt.toISOString(),
    updatedAt: typeof cat.updatedAt === 'string' ? cat.updatedAt : cat.updatedAt.toISOString(),
    amount: typeof cat.amount === 'number' ? cat.amount : parseFloat(cat.amount?.toString() || '0'),
  };
}

/**
 * Finance Budget Routes
 *
 * Handles all budget-related operations using the new API contract pattern.
 */
export const budgetRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /categories/list - ListOutput categories
  .post('/categories/list', async (c) => {
    const userId = c.get('userId')!;

    const result = await getAllBudgetCategories(userId);
    return c.json<BudgetCategoriesListOutput>(result.map(serializeBudgetCategory), 200);
  })

  // POST /categories/list-with-spending - ListOutput with spending
  .post(
    '/categories/list-with-spending',
    zValidator('json', z.object({ monthYear: z.string() })),
    async (c) => {
      const input = c.req.valid('json') as { monthYear: string };
      const userId = c.get('userId')!;

      const result = await getBudgetCategoriesWithSpending({
        userId,
        monthYear: input.monthYear,
      });

      const totalBudgeted = result.reduce((sum, item) => sum + item.budgetAmount, 0);

      return c.json<BudgetCategoriesListWithSpendingOutput>(
        result.map((item) => ({
          ...serializeBudgetCategory(item),
          actualSpending: item.actualSpending,
          percentageSpent: item.percentageSpent,
          budgetAmount: item.budgetAmount,
          allocationPercentage: totalBudgeted > 0 ? (item.budgetAmount / totalBudgeted) * 100 : 0,
          variance: item.variance,
          remaining: item.remaining,
          color: item.color || '#000000',
          status: item.status as any,
          statusColor: item.statusColor || '#000000',
        })),
        200,
      );
    },
  )

  // POST /categories/get - Get category
  .post('/categories/get', zValidator('json', z.object({ id: z.string().uuid() })), async (c) => {
    const input = c.req.valid('json') as { id: string };
    const userId = c.get('userId')!;

    const result = await getBudgetCategoryById(input.id, userId);
    if (!result) {
      throw new NotFoundError('Category not found');
    }
    return c.json<BudgetCategoryGetOutput>(serializeBudgetCategory(result), 200);
  })

  // POST /categories/create - Create category
  .post(
    '/categories/create',
    zValidator(
      'json',
      z.object({
        name: z.string().min(1),
        type: z.enum(['income', 'expense']),
        averageMonthlyExpense: z.string().optional(),
        budgetId: z.string().optional(),
        color: z.string().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      const existingCategory = await checkBudgetCategoryNameExists(input.name, userId);
      if (existingCategory) {
        throw new ConflictError(`A budget category named "${input.name}" already exists`);
      }

      const result = await createBudgetCategory({
        ...input,
        userId,
      });

      return c.json<BudgetCategoryCreateOutput>(serializeBudgetCategory(result), 201);
    },
  )

  // POST /categories/update - Update category
  .post(
    '/categories/update',
    zValidator(
      'json',
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        type: z.enum(['income', 'expense']).optional(),
        averageMonthlyExpense: z.string().optional(),
        budgetId: z.string().optional(),
        color: z.string().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;
      const { id, ...updateData } = input;

      const result = await updateBudgetCategory(id, userId, updateData);
      if (!result) {
        throw new NotFoundError('Category not found');
      }
      return c.json<BudgetCategoryUpdateOutput>(serializeBudgetCategory(result), 200);
    },
  )

  // POST /categories/delete - Delete category
  .post(
    '/categories/delete',
    zValidator('json', z.object({ id: z.string().uuid() })),
    async (c) => {
      const input = c.req.valid('json') as { id: string };
      const userId = c.get('userId')!;

      await deleteBudgetCategory(input.id, userId);
      return c.json<BudgetCategoryDeleteOutput>(
        {
          success: true,
          message: 'Budget category deleted successfully',
        },
        200,
      );
    },
  )

  // POST /tracking - Get tracking data
  .post('/tracking', zValidator('json', z.object({ monthYear: z.string() })), async (c) => {
    const input = c.req.valid('json') as { monthYear: string };
    const userId = c.get('userId')!;

    const result = await getBudgetTrackingData({
      userId,
      monthYear: input.monthYear,
    });
    return c.json<BudgetTrackingOutput>(result as any, 200);
  })

  // POST /history - Get budget history
  .post(
    '/history',
    zValidator('json', z.object({ months: z.number().int().min(1).optional() })),
    async (c) => {
      const input = c.req.valid('json') as { months?: number };
      const userId = c.get('userId')!;
      const months = input.months || 12;

      const userExpenseCategories = await getUserExpenseCategories(userId);

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum: number, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0,
      );

      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);

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

      const history = [];
      for (let i = 0; i < months; i++) {
        const targetIterationDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const year = targetIterationDate.getFullYear();
        const monthNum = targetIterationDate.getMonth();
        const monthKey = `${year}-${(monthNum + 1).toString().padStart(2, '0')}`;

        const displayMonth = targetIterationDate.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        });
        const actualSpending = actualsMap.get(monthKey) || 0;

        history.push({
          date: displayMonth,
          budgeted: totalMonthlyBudget,
          actual: actualSpending,
        });
      }

      return c.json<BudgetHistoryOutput>(history.reverse(), 200);
    },
  )

  // POST /calculate - Calculate personal budget
  .post(
    '/calculate',
    zValidator(
      'json',
      z
        .object({
          income: z.number(),
          expenses: z.array(z.object({ category: z.string(), amount: z.number() })).optional(),
        })
        .optional(),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      // If manual data is provided, use it directly
      if (input) {
        const expenses = input.expenses || [];
        const totalExpenses = expenses.reduce(
          (sum: number, expense: any) => sum + expense.amount,
          0,
        );
        const surplus = input.income - totalExpenses;
        const savingsRate = input.income > 0 ? (surplus / input.income) * 100 : 0;

        const categories = expenses.map((expense: any) => ({
          ...expense,
          percentage: input.income > 0 ? (expense.amount / input.income) * 100 : 0,
        }));

        const projections = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          savings: surplus * (i + 1),
          totalSaved: surplus * (i + 1),
        }));

        return c.json<BudgetCalculateOutput>(
          {
            totalBudget: totalExpenses,
            income: input.income,
            totalExpenses,
            surplus,
            savingsRate,
            categories,
            projections,
            calculatedAt: new Date().toISOString(),
            source: 'manual',
          },
          200,
        );
      }

      // Otherwise, use user's budget categories
      const userCategories = await getAllBudgetCategories(userId);

      if (userCategories.length === 0) {
        throw new NotFoundError('No budget categories found');
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

      const totalExpenses = expenses.reduce((sum: number, expense) => sum + expense.amount, 0);
      const surplus = income - totalExpenses;
      const savingsRate = income > 0 ? (surplus / income) * 100 : 0;

      const categories = expenses.map((expense) => ({
        ...expense,
        percentage: income > 0 ? (expense.amount / income) * 100 : 0,
      }));

      const projections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        savings: surplus * (i + 1),
        totalSaved: surplus * (i + 1),
      }));

      return c.json<BudgetCalculateOutput>(
        {
          totalBudget: totalExpenses,
          income,
          totalExpenses,
          surplus,
          savingsRate,
          categories,
          projections,
          calculatedAt: new Date().toISOString(),
          source: 'categories',
        },
        200,
      );
    },
  )

  // POST /transaction-categories - Get transaction categories
  .post('/transaction-categories', async (c) => {
    const userId = c.get('userId')!;

    const result = await getTransactionCategoriesAnalysis(userId);
    return c.json<TransactionCategoryAnalysisOutput>(result as any, 200);
  })

  // POST /bulk-create - Bulk create from transactions
  .post(
    '/bulk-create',
    zValidator(
      'json',
      z.object({
        categories: z.array(
          z.object({
            name: z.string(),
            type: z.enum(['income', 'expense']),
            averageMonthlyExpense: z.string().optional(),
            color: z.string().optional(),
          }),
        ),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      const result = await bulkCreateBudgetCategoriesFromTransactions(userId, input.categories);
      return c.json<BudgetBulkCreateOutput>(
        {
          created: result.created ?? 0,
          categories: result.categories.map(serializeBudgetCategory),
        },
        201,
      );
    },
  );
