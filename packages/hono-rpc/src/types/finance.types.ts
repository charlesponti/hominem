import { z } from 'zod';

import type { EmptyInput } from './utils';

import {
  accountListSchema,
  accountGetSchema,
  accountCreateSchema,
  accountUpdateSchema,
  accountDeleteSchema,
  institutionAccountsSchema,
} from '../routes/finance.accounts';
import {
  transactionListSchema,
  transactionUpdateSchema,
  transactionDeleteSchema,
} from '../routes/finance.transactions';

export type {
  // Transactions
  TransactionListOutput,
  TransactionCreateOutput,
  TransactionUpdateOutput,
  TransactionDeleteOutput,
  // Accounts
  AccountListOutput,
  AccountGetOutput,
  AccountCreateOutput,
  AccountUpdateOutput,
  AccountDeleteOutput,
  AccountAllOutput,
  AccountsWithPlaidOutput,
  AccountConnectionsOutput,
  AccountInstitutionAccountsOutput,
  // Plaid
  PlaidCreateLinkTokenOutput,
  PlaidExchangeTokenOutput,
  PlaidSyncItemOutput,
  PlaidRemoveConnectionOutput,
} from '../lib/typed-routes';

// ============================================================================
// Transaction Inputs
// ============================================================================

export type TransactionListInput = z.infer<typeof transactionListSchema>;

export type TransactionCreateInput = {
  accountId: string | null;
  date: string;
  amount: string;
  merchantName: string | null;
  category: string | null;
  description: string | null;
  transactionType: string | null;
  pending?: boolean;
  plaidTransactionId: string | null;
};

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionDeleteInput = z.infer<typeof transactionDeleteSchema>;

// ============================================================================
// Account Inputs
// ============================================================================

export type AccountListInput = z.infer<typeof accountListSchema>;
export type AccountGetInput = z.infer<typeof accountGetSchema>;
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
export type AccountInstitutionAccountsInput = z.infer<typeof institutionAccountsSchema>;

// ============================================================================
// Analyze Inputs
// ============================================================================

export type SpendingTimeSeriesInput = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
  groupBy?: 'month' | 'week' | 'day';
  includeStats?: boolean;
  compareToPrevious?: boolean;
};

export type TopMerchantsInput = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
};

export type CategoryBreakdownInput = {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
};

export type CalculateTransactionsInput = {
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  type?: 'income' | 'expense' | 'credit' | 'debit' | 'transfer' | 'investment';
  calculationType?: 'sum' | 'average' | 'count' | 'stats';
  descriptionLike?: string;
};

export type MonthlyStatsInput = {
  month: string;
};

// ============================================================================
// Categories Inputs
// ============================================================================

export type CategoriesListInput = EmptyInput;

// ============================================================================
// Plaid Inputs
// ============================================================================

export type PlaidCreateLinkTokenInput = EmptyInput;

export type PlaidExchangeTokenInput = {
  publicToken: string;
  institutionId: string;
  institutionName: string;
};

export type PlaidSyncItemInput = {
  itemId: string;
};

export type PlaidRemoveConnectionInput = {
  itemId: string;
};

// ============================================================================
// Budget Inputs
// ============================================================================

export type BudgetCategoriesListInput = EmptyInput;

export type BudgetCategoriesListWithSpendingInput = {
  monthYear: string;
};

export type BudgetCategoryGetInput = {
  id: string;
};

export type BudgetCategoryCreateInput = {
  name: string;
  type: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
};

export type BudgetCategoryUpdateInput = {
  id: string;
  name?: string;
  type?: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
};

export type BudgetCategoryDeleteInput = {
  id: string;
};

export type BudgetTrackingInput = {
  monthYear: string;
};

export type BudgetHistoryInput = {
  months?: number;
};

export type BudgetCalculateInput = {
  income?: number;
  expenses?: Array<{
    category: string;
    amount: number;
  }>;
};

export type BudgetBulkCreateInput = {
  categories: Array<{
    name: string;
    type: 'income' | 'expense';
    averageMonthlyExpense?: string;
    color?: string;
  }>;
};

// ============================================================================
// Institutions Inputs
// ============================================================================

export type InstitutionsListInput = EmptyInput;

export type InstitutionCreateInput = {
  id: string;
  name: string;
  url?: string;
  logo?: string;
  primaryColor?: string;
  country?: string;
};

// ============================================================================
// Runway Inputs
// ============================================================================

export type RunwayCalculateInput = {
  includeProjections?: boolean;
  months?: number;
};

// ============================================================================
// Export Inputs
// ============================================================================

export type ExportTransactionsInput = {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};

export type ExportSummaryInput = {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};

// ============================================================================
// Data Inputs
// ============================================================================

export type DataDeleteAllInput = EmptyInput;
