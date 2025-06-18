import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../../../middleware/auth.js'

const budgetSchema = z.object({
  income: z.number().positive(),
  expenses: z.array(
    z.object({
      category: z.string(),
      amount: z.number().positive(),
    })
  ),
})

export const financeBudgetRoutes = new Hono()

// Calculate budget endpoint
financeBudgetRoutes.post('/', requireAuth, zValidator('json', budgetSchema), async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    const validated = c.req.valid('json')

    // Calculate budget
    const totalExpenses = validated.expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const surplus = validated.income - totalExpenses
    const savingsRate = ((validated.income - totalExpenses) / validated.income) * 100

    // Category breakdown with percentages
    const categories = validated.expenses.map((expense) => ({
      ...expense,
      percentage: (expense.amount / validated.income) * 100,
    }))

    // Monthly projections for 12 months
    const projections = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      savings: surplus * (i + 1),
      totalSaved: surplus * (i + 1),
    }))

    const result = {
      income: validated.income,
      totalExpenses,
      surplus,
      savingsRate,
      categories,
      projections,
      calculatedAt: new Date().toISOString(),
    }

    // TODO: Add caching back when context typing is fixed

    return c.json(result)
  } catch (error) {
    console.error('Budget calculation error:', error)
    return c.json({ error: 'Failed to calculate budget' }, 500)
  }
})
