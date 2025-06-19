import { db } from '@hominem/utils/db'
import { summarizeByMonth } from '@hominem/utils/finance'
import { budgetCategories } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'

export const financeBudgetRoutes = new Hono()

// Zod schema for creating a budget category
const createBudgetCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['income', 'expense'], { message: "Type must be 'income' or 'expense'" }),
  // 'allocatedAmount' from the form maps to 'averageMonthlyExpense' in the DB
  allocatedAmount: z.number().min(0).optional(),
  budgetId: z.string().uuid('Invalid budget ID format').optional(),
})

// Zod schema for updating a budget category
const updateBudgetCategorySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['income', 'expense']).optional(),
  allocatedAmount: z.number().min(0).optional(),
  budgetId: z.string().uuid().optional(),
})

// Zod schema for personal budget calculation
const personalBudgetSchema = z.object({
  income: z.number().positive(),
  expenses: z.array(
    z.object({
      category: z.string(),
      amount: z.number().positive(),
    })
  ),
})

const budgetHistoryQuerySchema = z.object({
  months: z.coerce.number().min(1).max(60).optional().default(12),
})

const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

// Create a new budget category
financeBudgetRoutes.post(
  '/categories',
  requireAuth,
  zValidator('json', createBudgetCategorySchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const validatedData = c.req.valid('json')
      const { allocatedAmount, ...restOfData } = validatedData

      const [newCategory] = await db
        .insert(budgetCategories)
        .values({
          ...restOfData,
          id: crypto.randomUUID(),
          averageMonthlyExpense: allocatedAmount?.toString(), // Convert number to string for numeric type
          userId,
        })
        .returning()

      return c.json(newCategory, 201)
    } catch (error) {
      console.error('Error creating budget category:', error)
      return c.json(
        {
          error: 'Failed to create budget category',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Get all budget categories for the user
financeBudgetRoutes.get('/categories', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    const categories = await db.query.budgetCategories.findMany({
      where: eq(budgetCategories.userId, userId),
      orderBy: (table, { asc }) => [asc(table.name)],
    })
    return c.json(categories)
  } catch (error) {
    console.error('Error fetching budget categories:', error)
    return c.json(
      {
        error: 'Failed to fetch budget categories',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get a single budget category by ID
financeBudgetRoutes.get(
  '/categories/:id',
  requireAuth,
  zValidator('param', uuidParamSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      const category = await db.query.budgetCategories.findFirst({
        where: and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)),
      })

      if (!category) {
        return c.json({ error: 'Budget category not found' }, 404)
      }
      return c.json(category)
    } catch (error) {
      console.error('Error fetching budget category:', error)
      return c.json(
        {
          error: 'Failed to fetch budget category',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Update an existing budget category
financeBudgetRoutes.put(
  '/categories/:id',
  requireAuth,
  zValidator('param', uuidParamSchema),
  zValidator('json', updateBudgetCategorySchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')
    const validatedData = c.req.valid('json')

    if (Object.keys(validatedData).length === 0) {
      return c.json({ error: 'No update data provided' }, 400)
    }

    try {
      const { allocatedAmount, ...restOfData } = validatedData

      const [updatedCategory] = await db
        .update(budgetCategories)
        .set({
          ...restOfData,
          ...(allocatedAmount !== undefined && {
            averageMonthlyExpense: allocatedAmount.toString(),
          }),
        })
        .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)))
        .returning()

      if (!updatedCategory) {
        return c.json({ error: 'Budget category not found or not authorized to update' }, 404)
      }
      return c.json(updatedCategory)
    } catch (error) {
      console.error('Error updating budget category:', error)
      return c.json(
        {
          error: 'Failed to update budget category',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete a budget category
financeBudgetRoutes.delete(
  '/categories/:id',
  requireAuth,
  zValidator('param', uuidParamSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { id } = c.req.valid('param')

    try {
      const result = await db
        .delete(budgetCategories)
        .where(and(eq(budgetCategories.id, id), eq(budgetCategories.userId, userId)))

      // Note: Drizzle's delete behavior may vary by driver, but this should work for most cases
      if (result.length === 0) {
        return c.json({ error: 'Budget category not found or not authorized to delete' }, 404)
      }

      return c.json({ success: true, message: 'Budget category deleted successfully' })
    } catch (error) {
      console.error('Error deleting budget category:', error)
      return c.json(
        {
          error: 'Failed to delete budget category',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Get historical budget vs. actuals data
financeBudgetRoutes.get(
  '/history',
  requireAuth,
  zValidator('query', budgetHistoryQuerySchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const { months: monthsToFetch } = c.req.valid('query')

    try {
      const userExpenseCategories = await db.query.budgetCategories.findMany({
        where: and(eq(budgetCategories.userId, userId), eq(budgetCategories.type, 'expense')),
      })

      const totalMonthlyBudget = userExpenseCategories.reduce(
        (sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'),
        0
      )

      const today = new Date()
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of current month
      const startDate = new Date(today.getFullYear(), today.getMonth() - (monthsToFetch - 1), 1) // First day of the Nth month ago

      const allMonthlySummaries = await summarizeByMonth({
        userId,
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

      return c.json(results.reverse()) // Oldest to newest
    } catch (error) {
      console.error('Error fetching budget history:', error)
      return c.json(
        {
          error: 'Failed to fetch budget history',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Calculate personal budget using user data or manual input
financeBudgetRoutes.post(
  '/calculate',
  requireAuth,
  zValidator('json', personalBudgetSchema.optional()),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const manualData = c.req.valid('json')

      // If manual data is provided, use it directly
      if (manualData) {
        const { income, expenses } = manualData
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

        return c.json({
          income,
          totalExpenses,
          surplus,
          savingsRate,
          categories,
          projections,
          calculatedAt: new Date().toISOString(),
          source: 'manual',
        })
      }

      // Otherwise, use user's budget categories
      const userCategories = await db.query.budgetCategories.findMany({
        where: eq(budgetCategories.userId, userId),
        orderBy: (table, { asc }) => [asc(table.name)],
      })

      if (userCategories.length === 0) {
        return c.json(
          {
            error:
              'No budget categories found. Please create categories first or provide manual data.',
          },
          400
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
        return c.json(
          {
            error: 'No income categories found. Please add income categories first.',
          },
          400
        )
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

      return c.json({
        income,
        totalExpenses,
        surplus,
        savingsRate,
        categories,
        projections,
        calculatedAt: new Date().toISOString(),
        source: 'categories',
      })
    } catch (error) {
      console.error('Budget calculation error:', error)
      return c.json(
        {
          error: 'Failed to calculate budget',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
