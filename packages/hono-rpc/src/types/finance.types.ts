/**
 * Finance Domain Types
 *
 * All types needed for the Finance API domain:
 * - Input types: from Zod schemas or manual definitions
 * - Output types: manually defined lightweight DTOs to prevent type recursion
 * - Data types: shared structures used in both inputs and outputs
 *
 * This file is the single source of truth for finance types.
 * No complex inference from route schemas - all outputs are explicitly defined.
 */

import type { ApiResult } from '@hominem/services';

import { z } from 'zod';

import type { EmptyInput } from './utils';

// ============================================================================
// Shared Data Types
// ============================================================================

export type InstitutionData = {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
  primaryColor: string | null;
  products: string[];
  countryCodes: string[];
};

export type TimeSeriesDataPoint = {
  date: string;
  amount: number;
  expenses: number;
  income: number;
  count: number;
  average: number;
  trend?: {
    raw: string;
    formatted: string;
    direction: 'up' | 'down' | 'flat';
    percentChange?: string;
    previousAmount?: number;
    formattedPreviousAmount?: string;
    percentChangeExpenses?: string;
    rawExpenses?: string;
    previousExpenses?: number;
    formattedPreviousExpenses?: string;
    directionExpenses?: 'up' | 'down';
  };
  formattedAmount?: string;
  formattedIncome?: string;
  formattedExpenses?: string;
};

export type TimeSeriesStats = {
  total: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  periodCovered?: string;
  totalIncome?: number;
  totalExpenses?: number;
  averageIncome?: number;
  averageExpenses?: number;
  count?: number;
};

export type BudgetCategoryData = {
  id: string;
  name: string;
  type: string;
  amount: number;
  period: 'monthly' | 'yearly';
  rollover: boolean;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  averageMonthlyExpense?: string | number | null;
  userId?: string;
  budgetId?: string | null;
};

export type AccountData = {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance: number;
  currency: string;
  institutionId: string | null;
  plaidAccountId: string | null;
  mask: string | null;
  officialName: string | null;
  subtype: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string | null;
};

export type PlaidConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  status: 'active' | 'error' | 'disconnected';
  lastSynced: string;
  accounts: number;
};

export type AccountWithPlaidData = AccountData & {
  institution?: {
    id: string;
    name: string;
    logo: string | null;
  } | null;
  // Flattened properties often expected by frontend
  institutionName?: string;
  institutionLogo?: string | null;
  plaidItemId?: string;
  isPlaidConnected?: boolean;
  plaidItemStatus?: string;
  plaidLastSyncedAt?: string;
  plaidItemError?: string;
};

export type TransactionData = {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  categoryId: string | null;
  pending: boolean;
  paymentChannel: string | null;
  isoCurrencyCode: string | null;
  unofficialCurrencyCode: string | null;
  authorizedDate: string | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationRegion: string | null;
  locationPostalCode: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLon: number | null;
  logoUrl: string | null;
  website: string | null;
  notes: string | null;
  tags: string[] | null;
  excluded: boolean;
  recurring: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string; // Often an alias for name or similar
  type?: string;
};

// ============================================================================
// Accounts
// ============================================================================

export type AccountListInput = {
  includeInactive?: boolean;
};

export const accountListSchema = z.object({
  includeInactive: z.boolean().optional().default(false),
});

export type AccountGetInput = {
  id: string;
};

export const accountGetSchema = z.object({
  id: z.string().uuid(),
});

export type AccountCreateInput = {
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
};

export const accountCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['checking', 'savings', 'investment', 'credit']),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

export type AccountUpdateInput = {
  id: string;
  name?: string;
  type?: 'checking' | 'savings' | 'investment' | 'credit';
  balance?: number;
  institution?: string;
};

export const accountUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'credit']).optional(),
  balance: z.number().optional(),
  institution: z.string().optional(),
});

export type AccountDeleteInput = {
  id: string;
};

export const accountDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type AccountInstitutionAccountsInput = {
  institutionId: string;
};

export const institutionAccountsSchema = z.object({
  institutionId: z.string(),
});

export type AccountListOutput = ApiResult<AccountData[]>;

export type AccountGetOutput = ApiResult<
  AccountWithPlaidData & {
    transactions: TransactionData[];
  }
>;

export type AccountCreateOutput = ApiResult<AccountData>;
export type AccountUpdateOutput = ApiResult<AccountData>;
export type AccountDeleteOutput = ApiResult<{ success: true }>;

export type AccountAllOutput = ApiResult<{
  accounts: (AccountWithPlaidData & { transactions: TransactionData[] })[];
  connections: PlaidConnection[];
}>;

export type AccountsWithPlaidOutput = ApiResult<AccountWithPlaidData[]>;
export type AccountConnectionsOutput = ApiResult<PlaidConnection[]>;
export type AccountInstitutionAccountsOutput = ApiResult<AccountWithPlaidData[]>;

// ============================================================================
// Transactions
// ============================================================================

export type TransactionListInput = {
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
};

export const transactionListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  account: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  description: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.array(z.string()).optional(),
  sortDirection: z.array(z.enum(['asc', 'desc'])).optional(),
});

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

export type TransactionUpdateInput = {
  id: string;
  data: {
    accountId?: string;
    amount?: number;
    description?: string;
    category?: string;
    date?: string | Date;
    merchantName?: string;
    note?: string;
    tags?: string;
    excluded?: boolean;
    recurring?: boolean;
  };
};

export const transactionUpdateSchema = z.object({
  id: z.string().uuid(),
  data: z.object({
    accountId: z.string().uuid().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    date: z.union([z.string(), z.date()]).optional(),
    merchantName: z.string().optional(),
    note: z.string().optional(),
    tags: z.string().optional(),
    excluded: z.boolean().optional(),
    recurring: z.boolean().optional(),
  }),
});

export type TransactionDeleteInput = {
  id: string;
};

export const transactionDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type TransactionListOutput = ApiResult<{
  data: TransactionData[];
  filteredCount: number;
  totalUserCount: number;
}>;

export type TransactionCreateOutput = ApiResult<TransactionData>;
export type TransactionUpdateOutput = ApiResult<TransactionData>;
export type TransactionDeleteOutput = ApiResult<{ success: boolean; message?: string }>;

// ============================================================================
// Institutions
// ============================================================================

export type InstitutionsListInput = EmptyInput;
export type InstitutionsListOutput = ApiResult<InstitutionData[]>;

export type InstitutionCreateInput = {
  id: string;
  name: string;
  logo?: string;
  url?: string;
  primaryColor?: string;
  country?: string;
};
export type InstitutionCreateOutput = ApiResult<InstitutionData>;

// ============================================================================
// Categories
// ============================================================================

export type CategoriesListInput = EmptyInput;
export type CategoriesListOutput = ApiResult<string[]>;

// ============================================================================
// Analytics / Analyze
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

export type SpendingTimeSeriesOutput = ApiResult<{
  data: TimeSeriesDataPoint[];
  stats?: TimeSeriesStats | null;
}>;

export type TopMerchantsInput = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
};

export type TopMerchantsOutput = ApiResult<{
  merchants: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
  }>;
}>;

export type CategoryBreakdownInput = {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
};

export type CategoryBreakdownOutput = ApiResult<{
  breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  totalSpending: number;
  averagePerDay: number;
}>;

export type CalculateTransactionsInput = {
  from?: string;
  to?: string;
  category?: string;
  account?: string;
  type?: 'income' | 'expense' | 'credit' | 'debit' | 'transfer' | 'investment';
  calculationType?: 'sum' | 'average' | 'count' | 'stats';
  descriptionLike?: string;
  transactionIds?: string[];
};

export type CalculateTransactionsOutput = ApiResult<{
  sum?: number;
  average?: number;
  count?: number;
  stats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  formattedSum?: string;
  formattedAverage?: string;
}>;

export type MonthlyStatsInput = {
  year?: number;
  month?: number;
};

export type MonthlyStatsOutput = ApiResult<{
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  averageTransaction: number;
  topCategory: string;
  topMerchant: string;
  formattedIncome: string;
  formattedExpenses: string;
  formattedNet: string;
  formattedAverage: string;
  totalIncome?: number;
  totalExpenses?: number;
  netIncome?: number;
  categorySpending?: Array<{ name: string | null; amount: number }>;
  startDate?: string;
  endDate?: string;
}>;

// ============================================================================
// Budget
// ============================================================================

export type BudgetCategoriesListInput = EmptyInput;
export type BudgetCategoriesListOutput = ApiResult<BudgetCategoryData[]>;

export type BudgetCategoriesListWithSpendingInput = {
  month?: string;
  monthYear?: string;
};

export type BudgetCategoriesListWithSpendingOutput = ApiResult<
  Array<
    BudgetCategoryData & {
      actualSpending: number;
      percentageSpent: number;
      budgetAmount: number;
      allocationPercentage: number;
      variance: number;
      remaining: number;
      color: string;
      status: 'on-track' | 'warning' | 'over-budget';
      statusColor: string;
    }
  >
>;

export type BudgetCategoryGetInput = { id: string };
export type BudgetCategoryGetOutput = ApiResult<BudgetCategoryData>;

export type BudgetCategoryCreateInput = {
  name: string;
  type: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
  amount?: number;
  period?: 'monthly' | 'yearly';
  rollover?: boolean;
  icon?: string;
};
export type BudgetCategoryCreateOutput = ApiResult<BudgetCategoryData>;

export type BudgetCategoryUpdateInput = {
  id: string;
  name?: string;
  type?: 'income' | 'expense';
  averageMonthlyExpense?: string;
  budgetId?: string;
  color?: string;
  amount?: number;
  period?: 'monthly' | 'yearly';
  rollover?: boolean;
  icon?: string;
};
export type BudgetCategoryUpdateOutput = ApiResult<BudgetCategoryData>;

export type BudgetCategoryDeleteInput = { id: string };
export type BudgetCategoryDeleteOutput = ApiResult<{ success: true; message: string }>;

export type BudgetTrackingInput = {
  month?: string;
  monthYear?: string;
};

export type BudgetTrackingOutput = ApiResult<{
  month: string;
  monthYear?: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  status: 'on-track' | 'warning' | 'over-budget';
  summary?: any;
  categories: Array<{
    id: string;
    name: string;
    budgeted: number;
    spent: number;
    remaining: number;
    percentage: number;
    actualSpending?: number;
    percentageSpent?: number;
    budgetAmount?: number;
    allocationPercentage?: number;
    variance?: number;
    status?: 'on-track' | 'warning' | 'over-budget';
    statusColor?: string;
    color?: string;
  }>;
  chartData?: Array<{
    month: string;
    budgeted: number;
    actual: number;
  }>;
  pieData?: Array<{
    name: string;
    value: number;
  }>;
}>;

export type BudgetHistoryInput = {
  months?: number;
};

export type BudgetHistoryOutput = ApiResult<
  Array<{
    date: string;
    budgeted: number;
    actual: number;
  }>
>;

export type BudgetCalculateInput = {
  income: number;
  savingsGoal: number;
  allocations?: Record<string, number>;
  expenses?: Array<{
    category: string;
    amount: number;
  }>;
};

export type BudgetCalculateOutput = ApiResult<{
  totalBudget: number;
  disposable?: number;
  suggestedAllocations?: Record<string, number>;
  income?: number;
  totalExpenses?: number;
  surplus?: number;
  savingsRate?: number;
  categories?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  projections?: Array<{
    month: number;
    savings: number;
    totalSaved: number;
  }>;
  calculatedAt?: string;
  source?: 'manual' | 'categories';
}>;

export type BudgetBulkCreateInput = {
  categories: Array<{
    name: string;
    type: 'income' | 'expense';
    amount?: number;
    averageMonthlyExpense?: string;
    color?: string;
  }>;
};

export type BudgetBulkCreateOutput = ApiResult<{
  created: number;
  categories: BudgetCategoryData[];
}>;

export type TransactionCategoryAnalysisOutput = ApiResult<
  Array<{
    category: string;
    name?: string;
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    type?: 'income' | 'expense';
    suggested?: boolean;
    suggestedBudget?: number;
    monthsWithTransactions?: number;
  }>
>;

// ============================================================================
// Plaid
// ============================================================================

export type PlaidCreateLinkTokenInput = {
  userId: string;
};
export type PlaidCreateLinkTokenOutput = ApiResult<{
  linkToken: string;
  expiration: string;
  requestId: string;
}>;

export type PlaidExchangeTokenInput = {
  publicToken: string;
  institutionId?: string;
  institutionName?: string;
  metaData?: any;
};
export type PlaidExchangeTokenOutput = ApiResult<{
  accessToken: string;
  itemId: string;
  requestId: string;
}>;

export type PlaidSyncItemInput = {
  itemId: string;
};
export type PlaidSyncItemOutput = ApiResult<{
  success: boolean;
  added: number;
  modified: number;
  removed: number;
}>;

export type PlaidRemoveConnectionInput = {
  connectionId: string;
  itemId?: string;
};
export type PlaidRemoveConnectionOutput = ApiResult<{
  success: boolean;
}>;

// ============================================================================
// Runway
// ============================================================================

export type RunwayCalculateInput = {
  balance: number;
  monthlyExpenses: number;
  plannedPurchases?: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  projectionMonths?: number;
};

export type RunwayCalculateOutput = ApiResult<{
  runwayMonths: number;
  runwayEndDate: string;
  isRunwayDangerous: boolean;
  totalPlannedExpenses: number;
  projectionData: Array<{
    month: string;
    balance: number;
  }>;
  months: number;
  years: number;
}>;

// ============================================================================
// Export
// ============================================================================

export type ExportTransactionsInput = {
  format: 'csv' | 'json' | 'pdf';
  year?: number;
  month?: number;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};

export type ExportTransactionsOutput = ApiResult<{
  url: string;
  filename: string;
  expiresAt: string;
  data?: string;
  fileName?: string;
  createdAt?: string;
}>;

export type ExportSummaryInput = {
  year: number;
  format: 'pdf' | 'html' | 'csv' | 'json';
  startDate?: string;
  endDate?: string;
  accounts?: string[];
  categories?: string[];
};

export type ExportSummaryOutput = ApiResult<{
  url: string;
  filename: string;
  data?: string;
  fileName?: string;
  createdAt?: string;
}>;

// ============================================================================
// Data Management
// ============================================================================

export type DataDeleteAllInput = {
  confirm: boolean;
};

export type DataDeleteAllOutput = ApiResult<{
  success: boolean;
  deletedCounts?: {
    transactions: number;
    accounts: number;
    budgets: number;
    connections: number;
  };
  message?: string;
}>;
