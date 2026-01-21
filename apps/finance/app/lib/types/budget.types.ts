import type { RouterOutput } from '~/lib/trpc';

// Define the type based on what tRPC actually returns
export type BudgetCategory = RouterOutput['finance']['budget']['categories']['list'][0];

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
export type BudgetHistoryData = RouterOutput['finance']['budget']['history'][0];
export type TransactionsList = RouterOutput['finance']['transactions']['list'];
// Transaction categories analysis type
export type TransactionCategoryAnalysis =
  RouterOutput['finance']['budget']['transactionCategories'][0];
