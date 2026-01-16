import {
  bulkCreateBudgetCategoriesFromTransactions,
  checkBudgetCategoryNameExists,
  createBudgetCategory,
  deleteBudgetCategory,
  getAllBudgetCategories,
  getBudgetCategoriesWithSpending,
  getBudgetCategoryById,
  getBudgetTrackingData,
  getTransactionCategoriesAnalysis,
  getUserExpenseCategories,
  summarizeByMonth,
  updateBudgetCategory,
} from '@hominem/data/finance'
import { z } from 'zod'
import { protectedProcedure, router } from '../../procedures'

export const budgetRouter = router({
  categories: {
    list: protectedProcedure.query(async ({ ctx }) => {
      const categories = await getAllBudgetCategories(ctx.userId)
      return categories
    }),

    // New endpoint that returns categories with spending data for current month
    listWithSpending: protectedProcedure
      .input(
        z.object({
          monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Month year must be in YYYY-MM format'),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getBudgetCategoriesWithSpending({
          userId: ctx.userId,
          monthYear: input.monthYear,
        })
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid('Invalid ID format') }))
      .query(async ({ input, ctx }) => {
        const category = await getBudgetCategoryById(input.id, ctx.userId)
        return category
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, 'Name is required'),
          type: z.enum(['income', 'expense'], {
            message: "Type must be 'income' or 'expense'",
          }),
          averageMonthlyExpense: z.string().optional(),
          budgetId: z.string().uuid('Invalid budget ID format').optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existingCategory = await checkBudgetCategoryNameExists(input.name, ctx.userId)
        if (existingCategory) {
          throw new Error(`A budget category named "${input.name}" already exists for this user`)
        }

        const newCategory = await createBudgetCategory({
          ...input,
          userId: ctx.userId,
        })

        return newCategory
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid('Invalid ID format'),
          name: z.string().min(1).optional(),
          type: z.enum(['income', 'expense']).optional(),
          averageMonthlyExpense: z.string().optional(),
          budgetId: z.uuid().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input

        if (Object.keys(updateData).length === 0) {
          throw new Error('No update data provided')
        }

        const updatedCategory = await updateBudgetCategory(id, ctx.userId, updateData)

        return updatedCategory
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid('Invalid ID format') }))
      .mutation(async ({ input, ctx }) => {
        await deleteBudgetCategory(input.id, ctx.userId)

        return {
          success: true,
          message: 'Budget category deleted successfully',
        }
      }),
  },

  // New service-based endpoints
  tracking: protectedProcedure
    .input(
      z.object({
        monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Month year must be in YYYY-MM format'),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getBudgetTrackingData({
        userId: ctx.userId,
        monthYear: input.monthYear,
      })
    }),

  history: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(60).optional().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const { months } = input

      const userExpenseCategories = await getUserExpenseCategories(ctx.userId)

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum: number, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0
      )

      const today = new Date()
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1) // First day of the Nth month ago

      const allMonthlySummaries = await summarizeByMonth({
        userId: ctx.userId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      })

      const actualsMap = new Map<string, number>()
      for (const summary of allMonthlySummaries) {
        if (summary.month && summary.expenses) {
          // Ensure month and expenses are present
          actualsMap.set(summary.month, Number.parseFloat(summary.expenses))
        }
      }

      const results = []
      for (let i = 0; i < months; i++) {
        const targetIterationDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const year = targetIterationDate.getFullYear()
        const monthNum = targetIterationDate.getMonth()
        const monthKey = `${year}-${(monthNum + 1).toString().padStart(2, '0')}` // YYYY-MM

        const displayMonth = targetIterationDate.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        })
        const actualSpending = actualsMap.get(monthKey) || 0

        results.push({
          date: displayMonth,
          budgeted: totalMonthlyBudget,
          actual: actualSpending,
        })
      }

      return results.reverse() // Oldest to newest
    }),

  // Personal Budget Calculation
  calculate: protectedProcedure
    .input(
      z
        .object({
          income: z.number().positive(),
          expenses: z.array(
            z.object({
              category: z.string(),
              amount: z.number().positive(),
            })
          ),
        })
        .optional()
    )
    .mutation(async ({ input, ctx }) => {
      // If manual data is provided, use it directly
      if (input) {
        const { income, expenses } = input
        const totalExpenses = expenses.reduce((sum: number, expense) => sum + expense.amount, 0)
        const surplus = income - totalExpenses
        const savingsRate = ((income - totalExpenses) / income) * 100

        // Category breakdown with percentages
        const categories = expenses.map((expense) => ({
          ...expense,
          percentage: (expense.amount / income) * 100,
        }))

        // Monthly projections for 12 months
        const projections = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          savings: surplus * (i + 1),
          totalSaved: surplus * (i + 1),
        }))

        return {
          income,
          totalExpenses,
          surplus,
          savingsRate,
          categories,
          projections,
          calculatedAt: new Date().toISOString(),
          source: 'manual' as const,
        }
      }

      // Otherwise, use user's budget categories
      const userCategories = await getAllBudgetCategories(ctx.userId)

      if (userCategories.length === 0) {
        throw new Error(
          'No budget categories found. Please create categories first or provide manual data.'
        )
      }

      // Calculate from user's categories
      const income = userCategories
        .filter((cat) => cat.type === 'income')
        .reduce((sum: number, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0)

      const expenses = userCategories
        .filter((cat) => cat.type === 'expense')
        .map((cat) => ({
          category: cat.name,
          amount: Number.parseFloat(cat.averageMonthlyExpense || '0'),
        }))

      if (income <= 0) {
        throw new Error('No income categories found. Please add income categories first.')
      }

      const totalExpenses = expenses.reduce((sum: number, expense) => sum + expense.amount, 0)
      const surplus = income - totalExpenses
      const savingsRate = ((income - totalExpenses) / income) * 100

      // Category breakdown with percentages
      const categories = expenses.map((expense) => ({
        ...expense,
        percentage: (expense.amount / income) * 100,
      }))

      // Monthly projections for 12 months
      const projections = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        savings: surplus * (i + 1),
        totalSaved: surplus * (i + 1),
      }))

      return {
        income,
        totalExpenses,
        surplus,
        savingsRate,
        categories,
        projections,
        calculatedAt: new Date().toISOString(),
        source: 'categories' as const,
      }
    }),

  transactionCategories: protectedProcedure.query(async ({ ctx }) => {
    return await getTransactionCategoriesAnalysis(ctx.userId)
  }),

  // Bulk Create from Transaction Categories
  bulkCreateFromTransactions: protectedProcedure
    .input(
      z.object({
        categories: z.array(
          z.object({
            name: z.string().min(1, 'Name is required'),
            type: z.enum(['income', 'expense'], {
              message: "Type must be 'income' or 'expense'",
            }),
            averageMonthlyExpense: z.string().optional(),
            color: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await bulkCreateBudgetCategoriesFromTransactions(ctx.userId, input.categories)
      return result
    }),
})
