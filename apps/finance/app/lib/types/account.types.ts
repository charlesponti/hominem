import type { AccountAllOutput } from '@hominem/hono-rpc/types/finance.types';

/**
 * Account type from the all accounts endpoint
 * Includes account details, Plaid connection info, and transactions
 */
export type Account = AccountAllOutput['accounts'][number];

/**
 * Extract just the account details without transactions
 */
export type AccountWithoutTransactions = Omit<Account, 'transactions'>;
