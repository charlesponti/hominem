/**
 * Transaction types used across the monorepo
 */
import type {
  FinanceTransaction,
  FinanceTransactionInsert,
  TransactionType,
} from '../../db/schema/finance.schema'

export type {
  FinanceTransaction as Transaction,
  FinanceTransactionInsert as TransactionInsert,
  TransactionType,
}

// Also export the new names directly for new code
export type { FinanceTransaction, FinanceTransactionInsert }

/**
 * Bank-specific transaction formats
 */

/**
 * Capital One transaction format
 */
export interface CapitalOneTransaction {
  Date: string
  Description: string
  Category: string
  Type: string
  Amount: string
  AccountName?: string
  AccountNumber?: string
}

/**
 * Copilot transaction format from CSV export
 */
export interface CopilotTransaction {
  date: string
  name: string
  amount: string
  status: string
  category: string
  parent_category?: string | null
  'parent category'?: string | null
  excluded: string | 'true' | 'false'
  tags: string
  type: string
  account: string
  account_mask: string
  'account mask': string
  note: string
  recurring: string
}

/**
 * Aggregation types
 */

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
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  search?: string

  // Legacy options (for backward compatibility)
  from?: string
  to?: string
  min?: string
  max?: string
  account?: string
}
