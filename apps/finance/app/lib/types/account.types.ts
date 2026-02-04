import type { AccountWithPlaidInfo, TransactionData } from '@hominem/hono-rpc/types/finance.types';

/**
 * Account type - represents a financial account from the API
 * Uses AccountWithPlaidInfo to include Plaid metadata for enriched account details
 */
export type Account = AccountWithPlaidInfo;

/**
 * Account with transactions included
 */
export type AccountWithTransactions = AccountWithPlaidInfo & { transactions: TransactionData[] };
