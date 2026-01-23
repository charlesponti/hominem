import type { FinanceTransaction } from '@hominem/db/schema';
import type { QueryTransactionsOutput } from '@hominem/finance-services';

/**
 * Explicit Type Contracts for Finance API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 *
 * Compare to tRPC:
 * - tRPC: inferRouterOutputs<AppRouter>['finance']['transactions']['list']
 *   - Must infer all 17 routers
 *   - 10,000+ type instantiations
 *   - 6+ seconds
 *
 * - Hono RPC: TransactionListOutput
 *   - Direct type reference
 *   - <10 type instantiations
 *   - Instant
 */

/**
 * Utility type to convert Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 */
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

// ============================================================================
// Transaction List
// ============================================================================

export interface TransactionListInput {
  from?: string;
  to?: string;
  category?: string;
  min?: string;
  max?: string;
  account?: string;
  limit?: number;
  offset?: number;
  description?: string;
  search?: string;
  sortBy?: string[];
  sortDirection?: ('asc' | 'desc')[];
}

export type TransactionListOutput = QueryTransactionsOutput;

// ============================================================================
// Transaction Create
// ============================================================================

export type TransactionCreateInput = Omit<
  FinanceTransaction,
  'id' | 'createdAt' | 'updatedAt' | 'userId'
>;

export type TransactionCreateOutput = JsonSerialized<FinanceTransaction>;

// ============================================================================
// Transaction Update
// ============================================================================

export interface TransactionUpdateInput {
  id: string;
  data: {
    accountId?: string;
    amount?: number;
    description?: string;
    category?: string;
    date?: Date;
    merchantName?: string;
    note?: string;
    tags?: string;
    excluded?: boolean;
    recurring?: boolean;
  };
}

export type TransactionUpdateOutput = JsonSerialized<FinanceTransaction>;

// ============================================================================
// Transaction Delete
// ============================================================================

export interface TransactionDeleteInput {
  id: string;
}

export interface TransactionDeleteOutput {
  success: boolean;
  message: string;
}

// ============================================================================
// Accounts
// ============================================================================

import type {
  FinanceAccount,
  AccountWithPlaidInfo,
  PlaidConnection,
  InstitutionConnection,
} from '@hominem/finance-services';

export interface AccountListInput {
  includeInactive?: boolean;
}

export type AccountListOutput = JsonSerialized<FinanceAccount[]>;

export interface AccountGetInput {
  id: string;
}

export type AccountGetOutput = JsonSerialized<
  AccountWithPlaidInfo & { transactions: FinanceTransaction[] }
> | null;

export interface AccountCreateInput {
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
}

export type AccountCreateOutput = JsonSerialized<FinanceAccount>;

export interface AccountUpdateInput {
  id: string;
  name?: string;
  type?: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
}

export type AccountUpdateOutput = JsonSerialized<FinanceAccount>;

export interface AccountDeleteInput {
  id: string;
}

export interface AccountDeleteOutput {
  success: boolean;
  message: string;
}

export interface AccountAllOutput {
  accounts: JsonSerialized<Array<AccountWithPlaidInfo & { transactions: FinanceTransaction[] }>>;
  connections: JsonSerialized<PlaidConnection[]>;
}

export type AccountsWithPlaidOutput = JsonSerialized<AccountWithPlaidInfo[]>;

export type AccountConnectionsOutput = InstitutionConnection[];

export interface AccountInstitutionAccountsInput {
  institutionId: string;
}

export type AccountInstitutionAccountsOutput = JsonSerialized<AccountWithPlaidInfo[]>;

// ============================================================================
// Analyze
// ============================================================================

export interface SpendingTimeSeriesInput {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
  groupBy?: 'month' | 'week' | 'day';
  includeStats?: boolean;
  compareToPrevious?: boolean;
}

export interface TopMerchantsInput {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
}

export interface CategoryBreakdownInput {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
}

export interface CalculateTransactionsInput {
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  type?: 'income' | 'expense' | 'credit' | 'debit' | 'transfer' | 'investment';
  calculationType?: 'sum' | 'average' | 'count' | 'stats';
  descriptionLike?: string;
}

export interface MonthlyStatsInput {
  month: string; // YYYY-MM format
}

// ============================================================================
// Categories
// ============================================================================

export type CategoriesListOutput = Awaited<
  ReturnType<typeof import('@hominem/finance-services').getSpendingCategories>
>;

// ============================================================================
// Plaid
// ============================================================================

export interface PlaidCreateLinkTokenOutput {
  success: boolean;
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeTokenInput {
  publicToken: string;
  institutionId: string;
  institutionName: string;
}

export interface PlaidExchangeTokenOutput {
  success: boolean;
  message: string;
  institutionName: string;
}

export interface PlaidSyncItemInput {
  itemId: string;
}

export interface PlaidSyncItemOutput {
  success: boolean;
  message: string;
}

export interface PlaidRemoveConnectionInput {
  itemId: string;
}

export interface PlaidRemoveConnectionOutput {
  success: boolean;
  message: string;
}

// ============================================================================
// Budget
// ============================================================================

import type { BudgetCategory } from '@hominem/db/schema';

export type BudgetCategoriesListOutput = BudgetCategory[];

export interface BudgetCategoriesListWithSpendingInput {
  monthYear: string; // YYYY-MM format
}

export interface BudgetCategoryGetInput {
  id: string;
}

export type BudgetCategoryGetOutput = BudgetCategory | null;

export interface BudgetCategoryCreateInput {
  name: string;
  type: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
}

export type BudgetCategoryCreateOutput = BudgetCategory;

export interface BudgetCategoryUpdateInput {
  id: string;
  name?: string;
  type?: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
}

export type BudgetCategoryUpdateOutput = BudgetCategory;

export interface BudgetCategoryDeleteInput {
  id: string;
}

export interface BudgetCategoryDeleteOutput {
  success: boolean;
  message: string;
}

export interface BudgetTrackingInput {
  monthYear: string; // YYYY-MM format
}

export interface BudgetHistoryInput {
  months?: number;
}

export interface BudgetCalculateInput {
  income?: number;
  expenses?: Array<{
    category: string;
    amount: number;
  }>;
}

export interface BudgetBulkCreateInput {
  categories: Array<{
    name: string;
    type: 'income' | 'expense';
    averageMonthlyExpense?: string;
    color?: string;
  }>;
}

// ============================================================================
// Institutions
// ============================================================================

import type { FinancialInstitution } from '@hominem/db/schema';

export type InstitutionsListOutput = JsonSerialized<FinancialInstitution[]>;

export interface InstitutionCreateInput {
  id: string;
  name: string;
  url?: string;
  logo?: string;
  primaryColor?: string;
  country?: string;
}

export type InstitutionCreateOutput = JsonSerialized<FinancialInstitution>;

// ============================================================================
// Runway
// ============================================================================

export type RunwayCalculateInput = Awaited<
  Parameters<typeof import('@hominem/finance-services').calculateRunway>[0]
>;

export interface RunwayCalculateOutput {
  success: boolean;
  data?: Awaited<ReturnType<typeof import('@hominem/finance-services').calculateRunway>>;
  error?: string;
}

// ============================================================================
// Export
// ============================================================================

export interface ExportTransactionsInput {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
}

export interface ExportTransactionsOutput {
  format: 'csv' | 'json';
  data: string | FinanceTransaction[];
  filename: string;
}

export interface ExportSummaryInput {
  format: 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
}

export interface ExportSummaryOutput {
  format: 'csv' | 'json';
  data: string | object;
  filename: string;
}

// ============================================================================
// Data
// ============================================================================

export interface DataDeleteAllOutput {
  success: boolean;
  message: string;
}
