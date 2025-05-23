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

export type { TimeSeriesDataPoint, TimeSeriesStats } from './finance-analyze.service.js'
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
