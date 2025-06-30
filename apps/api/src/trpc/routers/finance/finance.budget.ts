import { db } from '@hominem/utils/db'
import { summarizeByMonth } from '@hominem/utils/finance'
import { budgetCategories, transactions } from '@hominem/utils/schema'
import { and, eq, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import { protectedProcedure, router } from '../../index.js'

// Budget tRPC router
export const budgetRouter = router({
  // Budget Categories CRUD
  categories: {
    list: protectedProcedure.query(async ({ ctx }) => {
      const categories = await db.query.budgetCategories.findMany({
        where: eq(budgetCategories.userId, ctx.userId),
        orderBy: (table, { asc }) => [asc(table.name)],
      })
      return categories
    }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid('Invalid ID format') }))
      .query(async ({ input, ctx }) => {
        const category = await db.query.budgetCategories.findFirst({
          where: and(eq(budgetCategories.id, input.id), eq(budgetCategories.userId, ctx.userId)),
        })

        if (!category) {
          throw new Error('Budget category not found')
        }
        return category
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, 'Name is required'),
          type: z.enum(['income', 'expense'], { message: "Type must be 'income' or 'expense'" }),
          allocatedAmount: z.number().min(0).optional(),
          budgetId: z.string().uuid('Invalid budget ID format').optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { allocatedAmount, ...restOfData } = input

        // Check if category with this name already exists for this user
        const existingCategory = await db.query.budgetCategories.findFirst({
          where: and(
            eq(budgetCategories.name, restOfData.name),
            eq(budgetCategories.userId, ctx.userId)
          ),
        })

        if (existingCategory) {
          throw new Error(
            `A budget category named "${restOfData.name}" already exists for this user`
          )
        }

        const [newCategory] = await db
          .insert(budgetCategories)
          .values({
            ...restOfData,
            id: crypto.randomUUID(),
            averageMonthlyExpense: allocatedAmount?.toString(), // Convert number to string for numeric type
            userId: ctx.userId,
          })
          .returning()

        return newCategory
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid('Invalid ID format'),
          name: z.string().min(1).optional(),
          type: z.enum(['income', 'expense']).optional(),
          allocatedAmount: z.number().min(0).optional(),
          budgetId: z.string().uuid().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, allocatedAmount, ...restOfData } = input

        if (Object.keys(restOfData).length === 0 && allocatedAmount === undefined) {
          throw new Error('No update data provided')
        }

        const [updatedCategory] = await db
          .update(budgetCategories)
          .set({
            ...restOfData,
            ...(allocatedAmount !== undefined && {
              averageMonthlyExpense: allocatedAmount.toString(),
            }),
          })
          .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, ctx.userId)))
          .returning()

        if (!updatedCategory) {
          throw new Error('Budget category not found or not authorized to update')
        }
        return updatedCategory
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid('Invalid ID format') }))
      .mutation(async ({ input, ctx }) => {
        const result = await db
          .delete(budgetCategories)
          .where(and(eq(budgetCategories.id, input.id), eq(budgetCategories.userId, ctx.userId)))

        // Note: Drizzle's delete behavior may vary by driver, but this should work for most cases
        if (result.length === 0) {
          throw new Error('Budget category not found or not authorized to delete')
        }

        return { success: true, message: 'Budget category deleted successfully' }
      }),
  },

  // Budget History and Analytics
  history: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(60).optional().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const { months: monthsToFetch } = input

      const userExpenseCategories = await db.query.budgetCategories.findMany({
        where: and(eq(budgetCategories.userId, ctx.userId), eq(budgetCategories.type, 'expense')),
      })

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0
      )

      const today = new Date()
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth() - (monthsToFetch - 1), 1) // First day of the Nth month ago

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
      for (let i = 0; i < monthsToFetch; i++) {
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
          actual: -actualSpending,
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
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
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
      const userCategories = await db.query.budgetCategories.findMany({
        where: eq(budgetCategories.userId, ctx.userId),
        orderBy: (table, { asc }) => [asc(table.name)],
      })

      if (userCategories.length === 0) {
        throw new Error(
          'No budget categories found. Please create categories first or provide manual data.'
        )
      }

      // Calculate from user's categories
      const income = userCategories
        .filter((cat) => cat.type === 'income')
        .reduce((sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0)

      const expenses = userCategories
        .filter((cat) => cat.type === 'expense')
        .map((cat) => ({
          category: cat.name,
          amount: Number.parseFloat(cat.averageMonthlyExpense || '0'),
        }))

      if (income <= 0) {
        throw new Error('No income categories found. Please add income categories first.')
      }

      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
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

  // Transaction Categories Analysis
  transactionCategories: protectedProcedure.query(async ({ ctx }) => {
    // Get distinct categories from transactions
    const transactionCategories = await db
      .select({
        category: sql<string>`COALESCE(${transactions.category}, 'Uncategorized')`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`SUM(${transactions.amount})`,
        avgAmount: sql<number>`AVG(${transactions.amount})`,
      })
      .from(transactions)
      .where(eq(transactions.userId, ctx.userId))
      .groupBy(sql`COALESCE(${transactions.category}, 'Uncategorized')`)
      .orderBy(sql`COUNT(*) DESC`)

    // Filter out empty/null categories and format the response
    const categories = transactionCategories
      .filter(
        (row) => row.category && row.category !== 'Uncategorized' && row.category.trim() !== ''
      )
      .map((row) => ({
        name: row.category,
        transactionCount: row.count,
        totalAmount: Number.parseFloat(row.totalAmount.toString()),
        averageAmount: Number.parseFloat(row.avgAmount.toString()),
        suggestedBudget: Math.abs(Number.parseFloat(row.avgAmount.toString()) * 12), // Monthly average * 12
      }))

    return categories
  }),

  // Bulk Create from Transaction Categories
  bulkCreateFromTransactions: protectedProcedure
    .input(
      z.object({
        categories: z.array(
          z.object({
            name: z.string().min(1, 'Name is required'),
            type: z.enum(['income', 'expense'], { message: "Type must be 'income' or 'expense'" }),
            allocatedAmount: z.number().min(0).optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { categories } = input

      if (categories.length === 0) {
        throw new Error('No categories provided')
      }

      // Get existing budget category names for this user
      const existingCategories = await db.query.budgetCategories.findMany({
        where: eq(budgetCategories.userId, ctx.userId),
        columns: { name: true },
      })
      const existingNames = new Set(existingCategories.map((cat) => cat.name.toLowerCase()))

      // Filter out categories that already exist (case-insensitive comparison)
      const newCategories = categories.filter((cat) => !existingNames.has(cat.name.toLowerCase()))

      if (newCategories.length === 0) {
        return {
          success: true,
          message: 'All categories already exist',
          categories: [],
          skipped: categories.length,
        }
      }

      // Create only the new categories
      const createdCategories = await db
        .insert(budgetCategories)
        .values(
          newCategories.map((cat) => ({
            id: crypto.randomUUID(),
            name: cat.name,
            type: cat.type,
            averageMonthlyExpense: cat.allocatedAmount?.toString() || '0',
            userId: ctx.userId,
          }))
        )
        .returning()

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
      }
    }),
})
