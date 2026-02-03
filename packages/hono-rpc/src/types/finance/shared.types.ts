/**
 * Finance Shared Data Types
 *
 * Common data structures used across all finance domains:
 * - Institution data
 * - Time series data and statistics
 * - Budget category data
 * - Account data and variants
 * - Transaction data
 */

import type {
  FinanceAccountOutput,
  FinanceTransactionOutput,
  BudgetCategoryOutput,
  FinancialInstitutionOutput,
} from '@hominem/db/types/finance';

export type InstitutionData = FinancialInstitutionOutput;

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

export type BudgetCategoryData = BudgetCategoryOutput;

export type AccountData = FinanceAccountOutput;

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
  institution?:
    | {
        id: string;
        name: string;
        logo: string | null;
      }
    | null
    | undefined;
  institutionName?: string | undefined;
  institutionLogo?: string | null | undefined;
  plaidItemId?: string | null | undefined;
  isPlaidConnected?: boolean | undefined;
  plaidItemStatus?: string | undefined;
  plaidLastSyncedAt?: string | undefined;
  plaidItemError?: string | undefined;
};

export type TransactionData = FinanceTransactionOutput;
