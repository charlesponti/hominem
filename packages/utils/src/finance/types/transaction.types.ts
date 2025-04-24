/**
 * Transaction types used across the monorepo
 */
import type {
  Transaction,
  TransactionInsert,
  TransactionType,
} from '../../db/schema/finance.schema'

export type { Transaction, TransactionInsert, TransactionType }

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
  transaction?: Transaction
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

  // Legacy options (for backward compatibility)
  from?: string
  to?: string
  min?: string
  max?: string
  account?: string
}
