import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import {
  calculateBudgetBreakdown,
  calculateBudgetBreakdownInputSchema,
  calculateLoanDetails,
  calculateRunway,
  calculateSavingsGoal,
  calculateSavingsGoalInputSchema,
  runwayCalculationSchema,
} from '@hominem/finance-services'

import { authMiddleware } from '../middleware/auth'
import type { RunwayCalculateOutput } from '@hominem/rpc/types/finance/runway.types'

import type { AppContext } from '../middleware/auth'

const numberSchema = z.union([z.number(), z.string()]).transform((value) =>
  typeof value === 'number' ? value : Number.parseFloat(value),
)

const plannedPurchaseSchema = z.object({
  description: z.string(),
  amount: numberSchema,
  date: z.string(),
})

const runwayInputSchema = z.object({
  balance: numberSchema,
  monthlyExpenses: numberSchema,
  plannedPurchases: z.array(plannedPurchaseSchema).optional(),
  projectionMonths: z.union([z.number(), z.string()]).optional().transform((value) => {
    if (value === undefined) {
      return 24
    }
    return typeof value === 'number' ? value : Number.parseInt(value, 10)
  }),
})

const budgetBreakdownInputSchema = z.object({
  monthlyIncome: numberSchema,
  savingsTarget: numberSchema.optional(),
})

const savingsGoalInputSchema = z.object({
  currentSavings: numberSchema,
  goalAmount: numberSchema,
  monthlyContribution: numberSchema,
  interestRate: numberSchema.optional(),
})

const loanDetailsInputSchema = z.object({
  principal: numberSchema,
  annualRate: numberSchema,
  months: z.union([z.number().int().positive(), z.string()]).transform((value) =>
    typeof value === 'number' ? value : Number.parseInt(value, 10),
  ),
})

export const runwayRoutes = new Hono<AppContext>()
  .post('/calculate', authMiddleware, zValidator('json', runwayInputSchema), async (c) => {
    const input = c.req.valid('json')
    const parsed = runwayCalculationSchema.parse({
      monthlyIncome: 0,
      monthlyExpenses: input.monthlyExpenses,
      cashReserve: input.balance,
    })
    const result = calculateRunway(parsed)
    const projectionMonths = Math.max(1, Math.min(120, input.projectionMonths ?? 24))
    const monthlyPurchases = new Map<number, number>()
    for (const purchase of input.plannedPurchases ?? []) {
      const purchaseDate = new Date(`${purchase.date}T00:00:00Z`)
      if (!Number.isNaN(purchaseDate.getTime())) {
        const index = Math.max(0, Math.floor((purchaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
        monthlyPurchases.set(index, (monthlyPurchases.get(index) ?? 0) + purchase.amount)
      }
    }
    const projectionData: RunwayCalculateOutput['projectionData'] = []
    let runningBalance = input.balance
    for (let month = 0; month < projectionMonths; month++) {
      runningBalance -= input.monthlyExpenses
      runningBalance -= monthlyPurchases.get(month) ?? 0
      const projectedDate = new Date()
      projectedDate.setMonth(projectedDate.getMonth() + month + 1)
      projectionData.push({
        month: projectedDate.toISOString().slice(0, 7),
        balance: runningBalance,
      })
    }

    const totalPlannedExpenses = [...monthlyPurchases.values()].reduce((sum, value) => sum + value, 0)
    const runwayEndDate = new Date()
    if (result.months !== Number.POSITIVE_INFINITY) {
      runwayEndDate.setMonth(runwayEndDate.getMonth() + result.months)
    }

    return c.json<RunwayCalculateOutput>({
      runwayMonths: result.months,
      runwayEndDate: runwayEndDate.toISOString(),
      isRunwayDangerous: result.months !== Number.POSITIVE_INFINITY && result.months <= 6,
      totalPlannedExpenses,
      projectionData,
      months: result.months,
      years: result.months === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : result.months / 12,
    })
  })
  .post(
    '/budget-breakdown',
    authMiddleware,
    zValidator('json', budgetBreakdownInputSchema),
    async (c) => {
      const input = c.req.valid('json')
      const parsed = calculateBudgetBreakdownInputSchema.parse(input)
      return c.json(calculateBudgetBreakdown(parsed))
    },
  )
  .post('/savings-goal', authMiddleware, zValidator('json', savingsGoalInputSchema), async (c) => {
    const input = c.req.valid('json')
    const parsed = calculateSavingsGoalInputSchema.parse(input)
    return c.json(calculateSavingsGoal(parsed))
  })
  .post('/loan-details', authMiddleware, zValidator('json', loanDetailsInputSchema), async (c) => {
    const input = c.req.valid('json')
    const result = calculateLoanDetails({
      principal: input.principal,
      annualRate: input.annualRate,
      months: input.months,
    })
    return c.json(result)
  })
