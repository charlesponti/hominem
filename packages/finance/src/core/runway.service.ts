import * as z from 'zod'

/**
 * Input schema for runway calculations.
 */
export const runwayCalculationSchema = z.object({
  balance: z.number().min(0).describe('Current available balance'),
  monthlyExpenses: z.number().min(0).describe('Average monthly expenses'),
  plannedPurchases: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
        date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
      }),
    )
    .optional(),
  projectionMonths: z.number().min(1).max(120).optional().default(12),
})

export type RunwayCalculationInput = z.infer<typeof runwayCalculationSchema>

/**
 * Individual month breakdown schema.
 */
export const monthlyBreakdownSchema = z.object({
  month: z.string(),
  expenses: z.number(),
  purchases: z.number(),
  endingBalance: z.number(),
})

export type MonthlyBreakdown = z.infer<typeof monthlyBreakdownSchema>

/**
 * Projection data point schema for charts.
 */
export const runwayProjectionSchema = z.object({
  month: z.string(),
  balance: z.number(),
})

export type RunwayProjection = z.infer<typeof runwayProjectionSchema>

/**
 * Output schema for the consolidated runway calculation.
 */
export const runwayCalculationOutputSchema = z.object({
  runwayMonths: z.number().describe('Number of months until balance hits zero'),
  burnRate: z.number().describe('Average monthly expenses used in calculation'),
  initialBalance: z.number().describe('The starting balance provided'),
  currentBalance: z.number().describe('Remaining balance after the projection period'),
  runwayEndDate: z.string().describe('Estimated date when balance will be zero'),
  monthlyBreakdown: z.array(monthlyBreakdownSchema),
  projectionData: z.array(runwayProjectionSchema),
  isRunwayDangerous: z.boolean().describe('True if runway is 6 months or less'),
  minimumBalance: z.number().describe('The lowest balance reached during the projection'),
  totalPlannedExpenses: z.number().describe('Sum of all planned one-time purchases'),
})

export type RunwayCalculationResult = z.infer<typeof runwayCalculationOutputSchema>

/**
 * Groups planned purchases by their YYYY-MM key for easier lookup during calculation.
 */
function groupPurchasesByMonth(purchases: NonNullable<RunwayCalculationInput['plannedPurchases']>) {
  const grouped: Record<string, number> = {}
  for (const purchase of purchases) {
    const date = new Date(purchase.date)
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`
    grouped[key] = (grouped[key] || 0) + purchase.amount
  }
  return grouped
}

/**
 * Consolidated financial runway calculation service.
 * Handles basic runway, detailed monthly breakdown, and chart projections.
 */
export function calculateRunway(input: RunwayCalculationInput): RunwayCalculationResult {
  const { balance, monthlyExpenses, plannedPurchases = [], projectionMonths = 12 } = input

  const purchasesByMonth = groupPurchasesByMonth(plannedPurchases)
  const totalPlannedExpenses = plannedPurchases.reduce((sum, p) => sum + p.amount, 0)

  const today = new Date()
  const monthlyBreakdown: MonthlyBreakdown[] = []
  const projectionData: RunwayProjection[] = []
  const balances: number[] = [balance]

  let runningBalance = balance
  let runwayMonths = 0
  const maxIterations = 121 // Safety limit (approx 10 years)

  // Simulation loop
  for (let i = 0; i < maxIterations; i++) {
    const currentDate = new Date(today)
    currentDate.setMonth(today.getMonth() + i)

    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`
    const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const monthPurchases = purchasesByMonth[monthKey] || 0
    const totalMonthOutflow = monthlyExpenses + monthPurchases

    const previousBalance = runningBalance
    runningBalance -= totalMonthOutflow
    balances.push(runningBalance)

    // Track monthly breakdown while balance is positive
    if (previousBalance > 0) {
      if (runningBalance > 0) {
        runwayMonths++
      }

      if (monthlyBreakdown.length < maxIterations) {
        monthlyBreakdown.push({
          month: monthLabel,
          expenses: monthlyExpenses,
          purchases: monthPurchases,
          endingBalance: runningBalance,
        })
      }
    }

    // Capture projection data for the requested window
    if (i < projectionMonths) {
      projectionData.push({
        month: monthLabel,
        balance: Math.round(runningBalance),
      })
    }

    // Break early if we've passed the runway and the projection window
    if (runningBalance <= 0 && i >= projectionMonths - 1) {
      break
    }
  }

  const runwayEndDate = new Date(today)
  runwayEndDate.setMonth(today.getMonth() + runwayMonths)

  return {
    runwayMonths: monthlyExpenses === 0 && runningBalance > 0 ? Number.POSITIVE_INFINITY : runwayMonths,
    burnRate: monthlyExpenses,
    initialBalance: balance,
    currentBalance: Math.max(0, runningBalance),
    runwayEndDate: runwayEndDate.toISOString(),
    monthlyBreakdown,
    projectionData,
    isRunwayDangerous: runwayMonths <= 6,
    minimumBalance: Math.min(...balances),
    totalPlannedExpenses,
  }
}
