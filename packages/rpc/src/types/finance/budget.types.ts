import type { EmptyInput } from '../utils';
import type { BudgetCategoryData } from './shared.types';

// ============================================================================
// Named Types for BudgetCategoriesListWithSpending
// ============================================================================

export type BudgetCategoryWithSpending = BudgetCategoryData & {
  actualSpending: number;
  percentageSpent: number;
  budgetAmount: number;
  allocationPercentage: number;
  variance: number;
  remaining: number;
  color: string;
  status: 'on-track' | 'warning' | 'over-budget';
  statusColor: string;
};

// ============================================================================
// Named Types for BudgetTrackingOutput
// ============================================================================

export type BudgetTrackingCategory = {
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
};

export type BudgetChartDataPoint = {
  month: string;
  budgeted: number;
  actual: number;
};

export type BudgetPieDataPoint = {
  name: string;
  value: number;
};

// ============================================================================
// Named Types for BudgetHistoryOutput
// ============================================================================

export type BudgetHistoryDataPoint = {
  date: string;
  budgeted: number;
  actual: number;
};

// ============================================================================
// Named Types for BudgetCalculateOutput
// ============================================================================

export type BudgetCategoryAllocation = {
  category: string;
  amount: number;
  percentage: number;
};

export type BudgetProjection = {
  month: number;
  savings: number;
  totalSaved: number;
};

// ============================================================================
// Named Types for BudgetBulkCreateInput
// ============================================================================

export type BudgetCategoryInput = {
  name: string;
  type: 'income' | 'expense';
  amount?: number;
  averageMonthlyExpense?: string;
  color?: string;
};

// ============================================================================
// Named Types for TransactionCategoryAnalysisOutput
// ============================================================================

export type TransactionCategoryAnalysis = {
  category: string;
  name?: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  type?: 'income' | 'expense';
  suggested?: boolean;
  suggestedBudget?: number;
  monthsWithTransactions?: number;
};

// ============================================================================
// Budget Operations
// ============================================================================

export type BudgetCategoriesListInput = EmptyInput;
export type BudgetCategoriesListOutput = BudgetCategoryData[];

export type BudgetCategoriesListWithSpendingInput = {
  month?: string;
  monthYear?: string;
};
export type BudgetCategoriesListWithSpendingOutput = BudgetCategoryWithSpending[];

export type BudgetCategoryGetInput = { id: string };
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

export type BudgetCategoryGetOutput = BudgetCategoryData;
export type BudgetCategoryCreateOutput = BudgetCategoryData;
export type BudgetCategoryUpdateOutput = BudgetCategoryData;

export type BudgetCategoryDeleteInput = { id: string };
export type BudgetCategoryDeleteOutput = { success: true; message: string };

export type BudgetTrackingInput = {
  month?: string;
  monthYear?: string;
};

export type BudgetTrackingOutput = {
  month: string;
  monthYear?: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  status: 'on-track' | 'warning' | 'over-budget';
  summary?: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    percentUsed: number;
  };
  categories: BudgetTrackingCategory[];
  chartData?: BudgetChartDataPoint[];
  pieData?: BudgetPieDataPoint[];
};

export type BudgetHistoryInput = {
  months?: number;
};

export type BudgetHistoryOutput = BudgetHistoryDataPoint[];

export type BudgetCalculateInput = {
  income: number;
  savingsGoal: number;
  allocations?: Record<string, number>;
  expenses?: Array<{
    category: string;
    amount: number;
  }>;
};

export type BudgetCalculateOutput = {
  totalBudget: number;
  disposable?: number;
  suggestedAllocations?: Record<string, number>;
  income?: number;
  totalExpenses?: number;
  surplus?: number;
  savingsRate?: number;
  categories?: BudgetCategoryAllocation[];
  projections?: BudgetProjection[];
  calculatedAt?: string;
  source?: 'manual' | 'categories';
};

export type BudgetBulkCreateInput = {
  categories: BudgetCategoryInput[];
};

export type BudgetBulkCreateOutput = {
  created: number;
  categories: BudgetCategoryData[];
};

export type TransactionCategoryAnalysisOutput = TransactionCategoryAnalysis[];
