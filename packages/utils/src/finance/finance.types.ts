/**
 * Finance account types
 */
import type { FinanceAccount, FinanceAccountInsert } from '../db/schema/finance.schema.js'

/**
 * Transaction types used across the monorepo
 */
import type {
  FinanceTransaction,
  FinanceTransactionInsert,
  TransactionType,
} from '../db/schema/finance.schema.js'

export type {
  FinanceAccount,
  FinanceAccountInsert,
  FinanceTransaction as Transaction,
  FinanceTransactionInsert as TransactionInsert,
  TransactionType,
}

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

/**
 * Transaction processing result
 */
export interface TransactionResult {
  action?: 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'
  transaction?: FinanceTransaction
  message?: string
  error?: Error
}

/**
 * Transaction search/query options
 */
export interface QueryOptions {
  userId: string
  category?: string | string[]
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  description?: string
  type?: TransactionType | TransactionType[]
  limit?: number
  offset?: number
  sortBy?: string | string[]
  sortDirection?: 'asc' | 'desc' | ('asc' | 'desc')[]
  search?: string
  includeExcluded?: boolean

  // Legacy options (for backward compatibility)
  from?: string
  to?: string
  min?: string
  max?: string
  account?: string
}
