import type { Database, Json } from '@hominem/db';
import type { Selectable } from 'kysely';

export type FinanceAccountRow = Selectable<Database['app.finance_accounts']>;
export type FinanceTransactionRow = Selectable<Database['app.finance_transactions']>;
export type TagRow = Selectable<Database['app.tags']>;

export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  plaidAccountId?: string | null;
}

export interface FinanceCategory {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface FinanceTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string | null;
  date: string;
  category?: string | null;
  merchantName?: string | null;
}

export interface FinanceAnalyticsTransaction extends FinanceTransaction {
  classification: string;
}

export interface PlaidItem {
  id: string;
  userId: string;
  itemId: string;
  institutionId?: string | null;
  transactionsCursor?: string | null;
  accessToken?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
}

export interface Institution {
  id: string;
  name: string;
}

export interface BudgetGoal {
  id: string;
  categoryId: string | null;
  targetAmount: number;
  targetPeriod: string;
}

export { type Json };
