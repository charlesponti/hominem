import { z } from 'zod'

export * from './finance.types'

export * as financeTestSeed from './__tests__/finance-test-seed'
export * from './core/cleanup.service'
export { tools } from './finance.tools'
export * from './finance.transactions.service'

// Core services
export * from './core/account.service'
export * from './core/institution.service'
export * from './core/runway.service'

// Budget services
export * from './core/budget-analytics.service'
export * from './core/budget-categories.service'
export * from './core/budget-goals.service'
export * from './core/budget-tracking.service'
export * from './core/budget.utils'

// Enhanced types
export * from './types/budget.types'

// Analytics services
export * from './analytics/aggregation.service'
export * from './analytics/time-series.service'
export * from './analytics/transaction-analytics.service'

// Processing services
export * from './processing'

export const categoryBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  limit: z.string().transform(Number).optional().default('5'),
})

export const runwayCalculationSchema = z.object({
  balance: z.number().positive(),
  monthlyExpenses: z.number().positive(),
  plannedPurchases: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
        date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
      })
    )
    .optional(),
})
