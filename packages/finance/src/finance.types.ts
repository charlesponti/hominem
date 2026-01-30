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
  category?: string | string[];
  dateFrom?: Date;
  dateTo?: Date;
  amountMin?: number;
  amountMax?: number;
  description?: string;
  type?: TransactionType | TransactionType[];
  limit?: number;
  offset?: number;
  sortBy?: string | string[];
  sortDirection?: 'asc' | 'desc' | ('asc' | 'desc')[];
  search?: string;
  includeExcluded?: boolean;

  // Legacy options (for backward compatibility)
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  account?: string;
}
