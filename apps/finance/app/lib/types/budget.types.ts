import type { BudgetCategoryData, TransactionListOutput } from '@hominem/rpc/finance';

export type BudgetCategory = BudgetCategoryData;

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
export type BudgetTransactions = TransactionListOutput;
