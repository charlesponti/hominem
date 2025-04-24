export * from './transaction.types'

// Re-export all account types
export * from './account.types'

export type { FinanceTransaction, FinanceTransactionInsert } from '../../db/schema/finance.schema'

export interface CategoryAggregate {
  category: string
  totalAmount: number
  count: number
}

export interface MonthAggregate {
  month: string
  totalAmount: number
  count: number
}
