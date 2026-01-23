import type {
  BudgetCategoriesListOutput,
  TransactionListOutput,
} from '@hominem/hono-rpc/types/finance.types';

// Define the type based on what the API returns
export type BudgetCategory = BudgetCategoriesListOutput[0];

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
