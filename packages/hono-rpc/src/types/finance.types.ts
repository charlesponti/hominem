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

// ============================================================================
// Finance Output Types - Manually defined to prevent type recursion
// ============================================================================

// Transactions
export type TransactionListOutput = {
  data: TransactionData[];
  filteredCount: number;
  totalUserCount: number;
};

export type TransactionCreateOutput = TransactionData;
export type TransactionUpdateOutput = TransactionData;
export type TransactionDeleteOutput = { success: true };

// Accounts
export type AccountListOutput = AccountData[];

export type AccountGetOutput = AccountWithPlaidData & {
  transactions: TransactionData[];
};

export type AccountCreateOutput = AccountData;
export type AccountUpdateOutput = AccountData;
export type AccountDeleteOutput = { success: true };

export type AccountAllOutput = {
  accounts: (AccountWithPlaidData & { transactions: TransactionData[] })[];
  connections: PlaidConnection[];
};

export type AccountsWithPlaidOutput = AccountWithPlaidData[];
export type AccountConnectionsOutput = PlaidConnection[];
export type AccountInstitutionAccountsOutput = AccountWithPlaidData[];

// Institutions
export type InstitutionsListOutput = InstitutionData[];
export type InstitutionCreateOutput = InstitutionData;

// Categories
export type CategoriesListOutput = string[];

// Analytics/Analyze
export type SpendingTimeSeriesOutput = {
  data: TimeSeriesDataPoint[];
  stats?: TimeSeriesStats | null;
};

export type TopMerchantsOutput = {
  merchants: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
  }>;
};

export type CategoryBreakdownOutput = {
  breakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  totalSpending: number;
  averagePerDay: number;
};

export type CalculateTransactionsOutput = {
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
};

export type MonthlyStatsOutput = {
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
};

// Budget
export type BudgetCategoriesListOutput = BudgetCategoryData[];

export type BudgetCategoriesListWithSpendingOutput = Array<
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
>;

export type BudgetCategoryGetOutput = BudgetCategoryData;
export type BudgetCategoryCreateOutput = BudgetCategoryData;
export type BudgetCategoryUpdateOutput = BudgetCategoryData;
export type BudgetCategoryDeleteOutput = { success: true; message: string };

export type BudgetTrackingOutput = {
  monthYear: string;
  summary: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
    budgetUsagePercentage: number;
    isOverBudget: boolean;
    categories: Array<
      BudgetCategoryData & {
        actualSpending: number;
        percentageSpent: number;
        budgetAmount: number;
        allocationPercentage: number;
        variance: number;
        remaining: number;
        status: 'on-track' | 'warning' | 'over-budget';
        statusColor: string;
      }
    >;
  };
  categories: Array<
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
  >;
  chartData: Array<{
    month: string;
    budgeted: number;
    actual: number;
  }>;
  pieData: Array<{
    name: string;
    value: number;
  }>;
};

export type BudgetHistoryOutput = Array<{
  date: string;
  budgeted: number;
  actual: number;
}>;

export type BudgetCalculateOutput = {
  income: number;
  totalExpenses: number;
  surplus: number;
  savingsRate: number;
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  projections: Array<{
    month: number;
    savings: number;
    totalSaved: number;
  }>;
  calculatedAt: string;
  source: 'manual' | 'categories';
};

export type BudgetBulkCreateOutput = BudgetCategoryData[];

export type TransactionCategoryAnalysisOutput = Array<{
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  type: 'income' | 'expense';
}>;

// Plaid
export type PlaidCreateLinkTokenOutput = { linkToken: string };
export type PlaidExchangeTokenOutput = { success: true };
export type PlaidSyncItemOutput = { success: true };
export type PlaidRemoveConnectionOutput = { success: true };

export type RunwayCalculateOutput = {
  success: boolean;
  error?: string;
  data?: {
    runwayMonths: number;
    runwayEndDate: string;
    isRunwayDangerous: boolean;
    totalPlannedExpenses: number;
    projectionData: Array<{
      month: string;
      balance: number;
    }>;
  };
};

// Export/Data
export type ExportTransactionsOutput = {
  data: string;
  format: 'csv' | 'json';
  fileName: string;
  createdAt: string;
};

export type ExportSummaryOutput = {
  data: string;
  format: 'csv' | 'json';
  fileName: string;
  createdAt: string;
};

export type DataDeleteAllOutput = { success: true; message: string };

// ============================================================================
// Finance Base Data Types
// ============================================================================

export type InstitutionData = {
  id: string;
  name: string;
  url: string | null;
  logo: string | null;
  primaryColor: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TimeSeriesDataPoint = {
  date: string;
  amount: number;
  count: number;
  average: number;
  formattedAmount: string;
  income: number;
  expenses: number;
  formattedIncome: string;
  formattedExpenses: string;
  trend?: {
    direction: 'up' | 'down';
    percentChange: string;
    raw: string;
    previousAmount: number;
    formattedPreviousAmount: string;
    percentChangeExpenses: string;
    rawExpenses: string;
    previousExpenses: number;
    formattedPreviousExpenses: string;
    directionExpenses: 'up' | 'down';
  };
};

export type TimeSeriesStats = {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  count: number;
  formattedTotal: string;
  totalIncome: number;
  averageIncome: number;
  medianIncome: number;
  minIncome: number;
  maxIncome: number;
  formattedTotalIncome: string;
  totalExpenses: number;
  averageExpenses: number;
  medianExpenses: number;
  minExpenses: number;
  maxExpenses: number;
  formattedTotalExpenses: string;
  periodCovered?: string;
};

export type BudgetCategoryData = {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  averageMonthlyExpense: string | null;
  budgetId: string | null;
  color: string | null;
};

export type AccountData = {
  id: string;
  userId: string;
  type: 'checking' | 'savings' | 'credit' | 'investment';
  balance: string;
  interestRate: string | null;
  minimumPayment: string | null;
  name: string;
  mask: string | null;
  subtype: string | null;
  officialName: string | null;
  institutionId: string | null;
  plaidItemId: string | null;
  createdAt: string;
  updatedAt: string;
  lastUpdated: string | null;
  isoCurrencyCode: string;
  meta: Record<string, any> | null;
};

export type AccountWithPlaidData = AccountData & {
  institutionName: string | null;
  institutionLogo: string | null;
  isPlaidConnected: boolean;
  plaidItemStatus: string | null;
  plaidItemError: any;
  plaidLastSyncedAt: string | null;
  plaidItemInternalId: string | null;
  plaidInstitutionId: string | null;
  plaidInstitutionName: string | null;
};

export type TransactionData = {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'credit' | 'debit' | 'transfer' | 'investment';
  amount: string;
  date: string;
  description: string | null;
  category: string | null;
  parentCategory: string | null;
  merchantName: string | null;
  accountMask: string | null;
  note: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  plaidTransactionId: string | null;
  pending: boolean;
  source: string;
};

export type PlaidConnection = {
  id: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  status: string;
  error: any;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Finance Input Types - Accounts
// ============================================================================

export type AccountListInput = z.infer<typeof accountListSchema>;
export type AccountGetInput = z.infer<typeof accountGetSchema>;
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
export type AccountInstitutionAccountsInput = z.infer<typeof institutionAccountsSchema>;

// ============================================================================
// Finance Input Types - Transactions
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
// Finance Input Types - Plaid
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
// Finance Input Types - Institutions
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
// Finance Input Types - Categories
// ============================================================================

export type CategoriesListInput = EmptyInput;

// ============================================================================
// Finance Input Types - Analytics
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
// Finance Input Types - Budget
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
  income: number;
  expenses: Array<{
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
// Finance Input Types - Runway
// ============================================================================

export type RunwayCalculateInput = {
  includeProjections?: boolean;
  months?: number;
  balance?: number;
  monthlyExpenses?: number;
  plannedPurchases?: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
};

// ============================================================================
// Finance Input Types - Export/Data
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

export type DataDeleteAllInput = EmptyInput;
