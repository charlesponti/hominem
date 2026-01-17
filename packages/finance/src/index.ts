import { z } from 'zod'

export {
  calculateBudgetBreakdownInputSchema,
  calculateBudgetBreakdownOutputSchema,
  calculateLoanDetailsInputSchema,
  calculateLoanDetailsOutputSchema,
  calculateRunwayInputSchema,
  calculateRunwayOutputSchema,
  calculateSavingsGoalInputSchema,
  calculateSavingsGoalOutputSchema,
  createFinanceAccountInputSchema,
  createTransactionInputSchema,
  deleteFinanceAccountInputSchema,
  deleteFinanceAccountOutputSchema,
  deleteTransactionInputSchema,
  deleteTransactionOutputSchema,
  FinanceAccountSchema,
  financeService,
  getCategoryBreakdownInputSchema,
  getCategoryBreakdownOutputSchema,
  getFinanceAccountsInputSchema,
  getFinanceAccountsOutputSchema,
  getSpendingCategoriesInputSchema,
  getSpendingCategoriesOutputSchema,
  getSpendingTimeSeriesInputSchema,
  getSpendingTimeSeriesOutputSchema,
  getTopMerchantsInputSchema,
  getTopMerchantsOutputSchema,
  getTransactionsInputSchema,
  getTransactionsOutputSchema,
  TransactionSchema,
  updateFinanceAccountInputSchema,
  updateTransactionInputSchema,
} from '../services/finance.service'
export * from './analytics/aggregation.service'
export * from './analytics/time-series.service'
export * from './analytics/transaction-analytics.service'
export * from './budget.types'
export * from './cleanup.service'
export * from './core/account.service'
export * from './core/budget.utils'
export * from './core/budget-analytics.service'
export * from './core/budget-categories.service'
export * from './core/budget-goals.service'
export * from './core/budget-tracking.service'
export * from './core/institution.service'
export * from './core/runway.service'
export { tools } from './finance.tools'
export * from './finance.transactions.service'
export * from './finance.types'

export * as financeTestSeed from './finance-test-seed'
export * from './plaid.service'
export * from './processing'

export const DEFAULT_CATEGORY_LIMIT = 5

export const categoryBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  limit: z.string().transform(Number).optional().default(DEFAULT_CATEGORY_LIMIT),
})
