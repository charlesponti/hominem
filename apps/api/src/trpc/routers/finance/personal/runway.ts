import { runwayCalculationSchema } from '@hominem/utils/finance'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
export const financeRunwayRoutes = new Hono()

// Calculate runway endpoint
financeRunwayRoutes.post('/', zValidator('json', runwayCalculationSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const validated = c.req.valid('json')

    // Runway calculation logic
    let balance = validated.balance
    const purchasesByMonth: Record<string, number> = {}

    // Process planned purchases if provided
    if (validated.plannedPurchases && validated.plannedPurchases.length > 0) {
      for (const purchase of validated.plannedPurchases) {
        const purchaseDate = new Date(purchase.date)
        const monthKey = `${purchaseDate.getFullYear()}-${purchaseDate.getMonth() + 1}`

        purchasesByMonth[monthKey] = (purchasesByMonth[monthKey] || 0) + purchase.amount
      }
    }

    // Calculate months of runway with monthly breakdown
    const today = new Date()
    const monthlyBreakdown = []
    const currentDate = new Date(today)
    let runwayMonths = 0

    while (balance > 0) {
      const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`
      const monthExpenses = validated.monthlyExpenses + (purchasesByMonth[monthKey] || 0)

      balance -= monthExpenses

      if (balance > 0) {
        runwayMonths++
        monthlyBreakdown.push({
          month: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          expenses: monthExpenses,
          purchases: purchasesByMonth[monthKey] || 0,
          endingBalance: balance,
        })

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      // Safety limit to prevent infinite loops
      if (runwayMonths > 120) break
    }

    // Calculate burn rate
    const burnRate = validated.monthlyExpenses
    const runwayEndDate = new Date(today)
    runwayEndDate.setMonth(today.getMonth() + runwayMonths)

    return c.json({
      runwayMonths,
      burnRate,
      initialBalance: validated.balance,
      currentBalance: balance > 0 ? balance : 0,
      runwayEndDate: runwayEndDate.toISOString(),
      monthlyBreakdown,
    })
  } catch (error) {
    console.error('Runway calculation error:', error)
    return c.json({ error: 'Failed to calculate runway' }, 500)
  }
})
