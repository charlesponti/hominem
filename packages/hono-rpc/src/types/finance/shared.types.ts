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
import type { AccountWithPlaidInfo } from '@hominem/finance-services';

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

/**
 * Account with Plaid metadata
 * Currently just an alias to AccountData since Plaid properties aren't part of the DB schema
 * This type exists for future expansion when Plaid sync metadata is added
 */
export type AccountWithPlaidData = AccountData;

export { type AccountWithPlaidInfo } from '@hominem/finance-services';

export type TransactionData = FinanceTransactionOutput;
