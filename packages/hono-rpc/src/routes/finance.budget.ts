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
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

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

import { authMiddleware, type AppContext } from '../middleware/auth';

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

  // POST /categories/list - List categories
  .post('/categories/list', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getAllBudgetCategories(userId);
      return c.json<BudgetCategoriesListOutput>(success(result.map(serializeBudgetCategory)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCategoriesListOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error listing budget categories:', err);
      return c.json<BudgetCategoriesListOutput>(error('INTERNAL_ERROR', 'Failed to list budget categories'), 500);
    }
  })

  // POST /categories/list-with-spending - List with spending
  .post(
    '/categories/list-with-spending',
    zValidator('json', z.object({ monthYear: z.string() })),
    async (c) => {
      const input = c.req.valid('json') as { monthYear: string };
      const userId = c.get('userId')!;

      try {
        const result = await getBudgetCategoriesWithSpending({
          userId,
          monthYear: input.monthYear,
        });
        return c.json<BudgetCategoriesListWithSpendingOutput>(
          success(result.map((item) => ({
            ...serializeBudgetCategory(item),
            actualSpending: item.actualSpending,
            percentageSpent: item.percentageSpent,
            budgetAmount: item.budgetAmount,
            allocationPercentage: item.allocationPercentage,
            variance: item.variance,
            remaining: item.remaining,
            color: item.color || '#000000',
            status: item.status as any,
            statusColor: item.statusColor || '#000000',
          }))),
          200,
        );
      } catch (err) {
        if (isServiceError(err)) {
          return c.json<BudgetCategoriesListWithSpendingOutput>(error(err.code, err.message), err.statusCode as any);
        }
        console.error('Error listing categories with spending:', err);
        return c.json<BudgetCategoriesListWithSpendingOutput>(error('INTERNAL_ERROR', 'Failed to list categories with spending'), 500);
      }
    },
  )

  // POST /categories/get - Get category
  .post('/categories/get', zValidator('json', z.object({ id: z.string().uuid() })), async (c) => {
    const input = c.req.valid('json') as { id: string };
    const userId = c.get('userId')!;

    try {
      const result = await getBudgetCategoryById(input.id, userId);
      if (!result) {
        return c.json<BudgetCategoryGetOutput>(error('NOT_FOUND', 'Category not found'), 404);
      }
      return c.json<BudgetCategoryGetOutput>(success(serializeBudgetCategory(result)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCategoryGetOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting budget category:', err);
      return c.json<BudgetCategoryGetOutput>(error('INTERNAL_ERROR', 'Failed to get budget category'), 500);
    }
  })

  // POST /categories/create - Create category
  .post('/categories/create', zValidator('json', z.object({
    name: z.string().min(1),
    type: z.enum(['income', 'expense']),
    averageMonthlyExpense: z.string().optional(),
    budgetId: z.string().optional(),
    color: z.string().optional(),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const existingCategory = await checkBudgetCategoryNameExists(input.name, userId);
      if (existingCategory) {
        return c.json<BudgetCategoryCreateOutput>(error('CONFLICT', `A budget category named "${input.name}" already exists`), 409);
      }

      const result = await createBudgetCategory({
        ...input,
        userId,
      });

      return c.json<BudgetCategoryCreateOutput>(success(serializeBudgetCategory(result)), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCategoryCreateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error creating budget category:', err);
      return c.json<BudgetCategoryCreateOutput>(error('INTERNAL_ERROR', 'Failed to create budget category'), 500);
    }
  })

  // POST /categories/update - Update category
  .post('/categories/update', zValidator('json', z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    type: z.enum(['income', 'expense']).optional(),
    averageMonthlyExpense: z.string().optional(),
    budgetId: z.string().optional(),
    color: z.string().optional(),
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;
    const { id, ...updateData } = input;

    try {
      const result = await updateBudgetCategory(id, userId, updateData);
      if (!result) {
        return c.json<BudgetCategoryUpdateOutput>(error('NOT_FOUND', 'Category not found'), 404);
      }
      return c.json<BudgetCategoryUpdateOutput>(success(serializeBudgetCategory(result)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCategoryUpdateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error updating budget category:', err);
      return c.json<BudgetCategoryUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update budget category'), 500);
    }
  })

  // POST /categories/delete - Delete category
  .post('/categories/delete', zValidator('json', z.object({ id: z.string().uuid() })), async (c) => {
    const input = c.req.valid('json') as { id: string };
    const userId = c.get('userId')!;

    try {
      await deleteBudgetCategory(input.id, userId);
      return c.json<BudgetCategoryDeleteOutput>(success({
        success: true,
        message: 'Budget category deleted successfully',
      }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCategoryDeleteOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error deleting budget category:', err);
      return c.json<BudgetCategoryDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete budget category'), 500);
    }
  })

  // POST /tracking - Get tracking data
  .post('/tracking', zValidator('json', z.object({ monthYear: z.string() })), async (c) => {
    const input = c.req.valid('json') as { monthYear: string };
    const userId = c.get('userId')!;

    try {
      const result = await getBudgetTrackingData({
        userId,
        monthYear: input.monthYear,
      });
      return c.json<BudgetTrackingOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetTrackingOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting budget tracking:', err);
      return c.json<BudgetTrackingOutput>(error('INTERNAL_ERROR', 'Failed to get budget tracking'), 500);
    }
  })

  // POST /history - Get budget history
  .post('/history', zValidator('json', z.object({ months: z.number().int().min(1).optional() })), async (c) => {
    const input = c.req.valid('json') as { months?: number };
    const userId = c.get('userId')!;
    const months = input.months || 12;

    try {
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

      return c.json<BudgetHistoryOutput>(success(history.reverse()), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetHistoryOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting budget history:', err);
      return c.json<BudgetHistoryOutput>(error('INTERNAL_ERROR', 'Failed to get budget history'), 500);
    }
  })

  // POST /calculate - Calculate personal budget
  .post('/calculate', zValidator('json', z.object({
    income: z.number(),
    expenses: z.array(z.object({ category: z.string(), amount: z.number() })).optional(),
  }).optional()), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
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

        return c.json<BudgetCalculateOutput>(success({
          totalBudget: totalExpenses,
          income: input.income,
          totalExpenses,
          surplus,
          savingsRate,
          categories,
          projections,
          calculatedAt: new Date().toISOString(),
          source: 'manual',
        }), 200);
      }

      // Otherwise, use user's budget categories
      const userCategories = await getAllBudgetCategories(userId);

      if (userCategories.length === 0) {
        return c.json<BudgetCalculateOutput>(error('NOT_FOUND', 'No budget categories found'), 404);
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

      return c.json<BudgetCalculateOutput>(success({
        totalBudget: totalExpenses,
        income,
        totalExpenses,
        surplus,
        savingsRate,
        categories,
        projections,
        calculatedAt: new Date().toISOString(),
        source: 'categories',
      }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetCalculateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error calculating budget:', err);
      return c.json<BudgetCalculateOutput>(error('INTERNAL_ERROR', 'Failed to calculate budget'), 500);
    }
  })

  // POST /transaction-categories - Get transaction categories
  .post('/transaction-categories', async (c) => {
    const userId = c.get('userId')!;

    try {
      const result = await getTransactionCategoriesAnalysis(userId);
      return c.json<TransactionCategoryAnalysisOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<TransactionCategoryAnalysisOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error getting transaction categories:', err);
      return c.json<TransactionCategoryAnalysisOutput>(error('INTERNAL_ERROR', 'Failed to get transaction categories'), 500);
    }
  })

  // POST /bulk-create - Bulk create from transactions
  .post('/bulk-create', zValidator('json', z.object({
    categories: z.array(z.object({
      name: z.string(),
      type: z.enum(['income', 'expense']),
      averageMonthlyExpense: z.string().optional(),
      color: z.string().optional(),
    }))
  })), async (c) => {
    const input = c.req.valid('json') as any;
    const userId = c.get('userId')!;

    try {
      const result = await bulkCreateBudgetCategoriesFromTransactions(userId, input.categories);
      return c.json<BudgetBulkCreateOutput>(success({
        created: result.created,
        categories: result.categories.map(serializeBudgetCategory),
      }), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<BudgetBulkCreateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error bulk creating categories:', err);
      return c.json<BudgetBulkCreateOutput>(error('INTERNAL_ERROR', 'Failed to bulk create categories'), 500);
    }
  });
