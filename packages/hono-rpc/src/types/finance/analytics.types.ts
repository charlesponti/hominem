import type { TimeSeriesDataPoint, TimeSeriesStats } from './shared.types';

// ============================================================================
// Named Types for TopMerchantsOutput
// ============================================================================

export type Merchant = {
  name: string;
  totalSpent: number;
  transactionCount: number;
};

// ============================================================================
// Named Types for CategoryBreakdownOutput
// ============================================================================

export type CategoryBreakdownItem = {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
};

// ============================================================================
// Named Types for CalculateTransactionsOutput
// ============================================================================

export type TransactionStats = {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
};

// ============================================================================
// Named Types for MonthlyStatsOutput
// ============================================================================

export type CategorySpendingItem = {
  name: string | null;
  amount: number;
};

// ============================================================================
// Named Types for SpendingDataPoint (route-specific explicit types)
// ============================================================================

export type SpendingDataPointBase = {
  date: string;
  amount: number;
  expenses: number;
  income: number;
  count: number;
  average: number;
  formattedAmount?: string;
  formattedIncome?: string;
  formattedExpenses?: string;
};

export type SpendingDataPointTrend = {
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

export type SpendingDataPointWithTrend = SpendingDataPointBase & {
  trend: SpendingDataPointTrend;
};

export type SpendingDataPoint = SpendingDataPointBase | SpendingDataPointWithTrend;

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
  merchants: Merchant[];
};

export type CategoryBreakdownInput = {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
};

export type CategoryBreakdownOutput = {
  breakdown: CategoryBreakdownItem[];
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
  stats?: TransactionStats;
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
  categorySpending?: CategorySpendingItem[];
  startDate?: string;
  endDate?: string;
};
