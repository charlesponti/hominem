import type {
  BudgetCategoryData,
  TransactionListOutput,
} from '@hominem/hono-rpc/types/finance.types';

// Define the type based on what the API returns - use the base data type
export type BudgetCategory = BudgetCategoryData;

// Define the UI-specific type that includes calculated properties
export interface BudgetCategoryWithSpending extends BudgetCategory {
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

// Budget history data type
export interface BudgetHistoryData {
  date: string;
  budgeted: number;
  actual: number;
}

export type TransactionsList = TransactionListOutput;

// Transaction categories analysis type
export interface TransactionCategoryAnalysis {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  type: 'income' | 'expense';
}
