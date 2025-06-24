import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
// Mock cost of living indices for demo
// In production, this would use real cost of living data APIs
const costOfLivingIndices = {
  'New York': 100,
  'San Francisco': 110,
  Austin: 65,
  Chicago: 75,
  London: 85,
  Tokyo: 95,
  Berlin: 70,
  Seattle: 90,
  Boston: 85,
  // Add more cities as needed
}

const locationComparisonSchema = z.object({
  currentLocation: z.string(),
  targetLocation: z.string(),
  income: z.number().positive(),
  expenses: z.array(
    z.object({
      category: z.string(),
      amount: z.number().positive(),
    })
  ),
})

export const financeLocationComparisonRoutes = new Hono()

// Calculate cost of living comparison between locations
financeLocationComparisonRoutes.post(
  '/',
  zValidator('json', locationComparisonSchema),
  async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'Not authorized' }, 401)
      }

      const validated = c.req.valid('json') as {
        currentLocation: keyof typeof costOfLivingIndices
        targetLocation: keyof typeof costOfLivingIndices
        income: number
        expenses: Array<{ category: string; amount: number }>
      }

      // Get indices or use default 100 if not found
      const currentIndex = costOfLivingIndices[validated.currentLocation] || 100
      const targetIndex = costOfLivingIndices[validated.targetLocation] || 100

      // Calculate cost of living difference
      const costDifference = targetIndex / currentIndex - 1

      // Calculate adjusted income and expenses
      const adjustedIncome = validated.income * (targetIndex / currentIndex)

      const adjustedExpenses = validated.expenses.map((expense) => ({
        category: expense.category,
        originalAmount: expense.amount,
        adjustedAmount: expense.amount * (targetIndex / currentIndex),
      }))

      // Calculate monthly surplus in both locations
      const currentTotalExpenses = validated.expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      )
      const adjustedTotalExpenses = adjustedExpenses.reduce(
        (sum, expense) => sum + expense.adjustedAmount,
        0
      )

      const currentSurplus = validated.income - currentTotalExpenses
      const adjustedSurplus = adjustedIncome - adjustedTotalExpenses

      // Quality of life change percentage
      const qolChangePercent =
        (adjustedSurplus / adjustedIncome - currentSurplus / validated.income) * 100

      return c.json({
        currentLocation: validated.currentLocation,
        targetLocation: validated.targetLocation,
        costDifferencePercent: costDifference * 100,
        currentIncome: validated.income,
        adjustedIncome,
        currentExpenses: currentTotalExpenses,
        adjustedExpenses: adjustedTotalExpenses,
        currentSurplus,
        adjustedSurplus,
        qualityOfLifeChangePercent: qolChangePercent,
        expenseBreakdown: adjustedExpenses,
        calculatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Location comparison calculation error:', error)
      return c.json({ error: 'Failed to calculate location comparison' }, 500)
    }
  }
)
