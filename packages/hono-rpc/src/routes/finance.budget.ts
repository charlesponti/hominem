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
import * as z from 'zod';

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
  type BudgetCategoryWithSpending,
} from '../types/finance.types';

/**
 * No serialization helpers needed!
 * Database types are returned directly - timestamps already as strings.
 */

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
    return c.json<BudgetCategoriesListOutput>(result, 200);
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

      const categoriesWithSpending: BudgetCategoryWithSpending[] = result.map((item) => ({
        ...item,
        actualSpending: item.actualSpending,
        percentageSpent: item.percentageSpent,
        budgetAmount: item.budgetAmount,
        allocationPercentage: totalBudgeted > 0 ? (item.budgetAmount / totalBudgeted) * 100 : 0,
        variance: item.variance,
        remaining: item.remaining,
        color: item.color || '#000000',
        status: item.status,
        statusColor: item.statusColor || '#000000',
      }));

      return c.json<BudgetCategoriesListWithSpendingOutput>(categoriesWithSpending, 200);
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
    return c.json<BudgetCategoryGetOutput>(result, 200);
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
        name: input.name,
        type: input.type,
        userId,
        ...(input.averageMonthlyExpense && { averageMonthlyExpense: input.averageMonthlyExpense }),
        ...(input.budgetId && { budgetId: input.budgetId }),
        ...(input.color && { color: input.color }),
      });

      if (!result) {
        throw new InternalError('Failed to create budget category');
      }

      return c.json<BudgetCategoryCreateOutput>(result, 201);
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
      const { id } = input;

      const result = await updateBudgetCategory(id, userId, {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.averageMonthlyExpense !== undefined && {
          averageMonthlyExpense: input.averageMonthlyExpense,
        }),
        ...(input.budgetId !== undefined && { budgetId: input.budgetId }),
        ...(input.color !== undefined && { color: input.color }),
      });
      if (!result) {
        throw new NotFoundError('Category not found');
      }
      return c.json<BudgetCategoryUpdateOutput>(result, 200);
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

    // Transform service data to API contract by adding computed fields
    const totalBudget = result.summary.totalBudgeted;
    const totalSpent = result.summary.totalActual;
    const remaining = totalBudget - totalSpent;
    const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    let status: 'on-track' | 'warning' | 'over-budget';
    if (percentSpent > 100) {
      status = 'over-budget';
    } else if (percentSpent > 80) {
      status = 'warning';
    } else {
      status = 'on-track';
    }

    const output: BudgetTrackingOutput = {
      month: input.monthYear,
      monthYear: input.monthYear,
      totalBudget,
      totalSpent,
      remaining,
      status,
      summary: result.summary,
      categories: result.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        budgeted: cat.budgetAmount,
        spent: cat.actualSpending,
        remaining: cat.remaining,
        percentage: cat.percentageSpent,
        actualSpending: cat.actualSpending,
        percentageSpent: cat.percentageSpent,
        budgetAmount: cat.budgetAmount,
        color: cat.color,
        status: cat.status,
        statusColor: cat.statusColor,
      })),
      chartData: result.chartData?.map((point) => ({
        ...point,
        month: input.monthYear, // Add month field required by API contract
      })),
      pieData: result.pieData,
    };

    return c.json<BudgetTrackingOutput>(output, 200);
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
        dateFrom: startDate.toISOString(),
        dateTo: endDate.toISOString(),
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

    // Transform service result: rename 'name' field to 'category'
    const transformed = result.map((item) => ({
      category: item.name,
      name: item.name,
      totalAmount: item.totalAmount,
      transactionCount: item.transactionCount,
      averageAmount: item.averageAmount,
      suggestedBudget: item.suggestedBudget,
      monthsWithTransactions: item.monthsWithTransactions,
    }));

    return c.json<TransactionCategoryAnalysisOutput>(transformed, 200);
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

      const result = await bulkCreateBudgetCategoriesFromTransactions(
        userId,
        input.categories.map((cat) => ({
          name: cat.name,
          type: cat.type,
          ...(cat.averageMonthlyExpense && { averageMonthlyExpense: cat.averageMonthlyExpense }),
          ...(cat.color && { color: cat.color }),
        })),
      );
      return c.json<BudgetBulkCreateOutput>(
        {
          created: result.created ?? 0,
          categories: result.categories,
        },
        201,
      );
    },
  );
