import type { AccountWithPlaidData, TransactionData } from '@hominem/hono-rpc/types/finance.types';

/**
 * Account type - represents a financial account with Plaid info
 */
export type Account = AccountWithPlaidData;

/**
 * Account with transactions included
 */
export type AccountWithTransactions = AccountWithPlaidData & { transactions: TransactionData[] };
