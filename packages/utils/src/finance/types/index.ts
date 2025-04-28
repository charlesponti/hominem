export * from './transaction.types'

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

export type CategorySummary = {
  category: string
  count: number
  total: string
  average: string
  minimum: string
  maximum: string
}

export type TopMerchant = {
  merchant: string
  frequency: number
  totalSpent: string
  firstTransaction: string
  lastTransaction: string
}
