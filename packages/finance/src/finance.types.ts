/**
 * Finance Service Types
 *
 * Import directly from specific type paths to avoid barrel imports.
 */

import type {
  FinanceAccountOutput,
  FinanceAccountInput,
  FinanceTransactionOutput,
  FinanceTransactionInput,
  TransactionType,
} from '@hominem/db/types/finance';

export type {
  FinanceAccountOutput,
  FinanceAccountInput,
  FinanceTransactionOutput as Transaction,
  FinanceTransactionInput as TransactionInsert,
  TransactionType,
};

export interface CategoryAggregate {
  category: string;
  totalAmount: number;
  count: number;
}

export interface MonthAggregate {
  month: string;
  totalAmount: number;
  count: number;
}

export type TopMerchant = {
  merchant: string;
  frequency: number;
  totalSpent: string;
  firstTransaction: string;
  lastTransaction: string;
};

/**
 * Transaction processing result
 */
export interface TransactionResult {
  action?: 'created' | 'updated' | 'skipped' | 'merged' | 'invalid';
  transaction?: FinanceTransactionOutput;
  message?: string;
  error?: Error;
}

/**
 * Transaction search/query options
 */
export interface QueryOptions {
  userId: string;
  category?: string | string[] | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  amountMin?: number | undefined;
  amountMax?: number | undefined;
  description?: string | undefined;
  type?: TransactionType | TransactionType[] | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  sortBy?: string | string[] | undefined;
  sortDirection?: 'asc' | 'desc' | ('asc' | 'desc')[] | undefined;
  search?: string | undefined;
  includeExcluded?: boolean | undefined;

  // Legacy options (for backward compatibility)
  from?: string | undefined;
  to?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  account?: string | undefined;
}
