import type { TimeSeriesDataPoint, TimeSeriesStats } from './shared.types';

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

export type SpendingTimeSeriesOutput = {
  data: TimeSeriesDataPoint[];
  stats?: TimeSeriesStats | null;
};

export type TopMerchantsInput = {
  from?: string;
  to?: string;
  account?: string;
  category?: string;
  limit?: number;
};

export type TopMerchantsOutput = {
  merchants: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
  }>;
};

export type CategoryBreakdownInput = {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
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

export type MonthlyStatsInput = {
  year?: number;
  month?: number;
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
  totalIncome?: number;
  totalExpenses?: number;
  netIncome?: number;
  categorySpending?: Array<{ name: string | null; amount: number }>;
  startDate?: string;
  endDate?: string;
};
