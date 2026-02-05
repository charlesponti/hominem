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

// ============================================================================
// Re-export Database Types (Single Source of Truth)
// ============================================================================

export type {
  FinancialInstitution as InstitutionData,
  BudgetCategory as BudgetCategoryData,
  FinanceAccount as AccountData,
  FinanceTransaction as TransactionData,
  AccountType,
  TransactionType,
} from '@hominem/db/types/finance';

export type {
  AccountWithPlaidInfo,
} from '../../schemas/finance.schema';

// ============================================================================
// API-Specific Computed Types
// ============================================================================

// Time series and statistics types (not in DB)
export type TimeSeriesTrend = {
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

export type TimeSeriesDataPoint = {
  date: string;
  amount: number;
  expenses: number;
  income: number;
  count: number;
  average: number;
  trend?: TimeSeriesTrend;
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

// Plaid connection metadata (not in DB schema)
export type PlaidConnection = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  status: 'active' | 'error' | 'disconnected';
  lastSynced: string;
  accounts: number;
};

// Account with Plaid metadata (future expansion)
import type { FinanceAccount } from '@hominem/db/types/finance';
export type AccountWithPlaidData = FinanceAccount;
