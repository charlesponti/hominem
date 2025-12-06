import { z } from 'zod'

export * as financeTestSeed from './finance-test-seed'
export * from './analytics/aggregation.service'
export * from './analytics/time-series.service'
export * from './analytics/transaction-analytics.service'
export * from './core/account.service'
export * from './core/budget.utils'
export * from './core/budget-analytics.service'
export * from './core/budget-categories.service'
export * from './core/budget-goals.service'
export * from './core/budget-tracking.service'
export * from './core/cleanup.service'
export * from './core/institution.service'
export * from './core/runway.service'
export { tools } from './finance.tools'
export * from './finance.transactions.service'
export * from './finance.types'
export * from './processing'
export * from './budget.types'

export const categoryBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  limit: z.string().transform(Number).optional().default('5'),
})
