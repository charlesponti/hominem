import type { Database } from '@hominem/db';
import type {
  AccountType,
  TransactionData,
  TransactionType,
} from '@hominem/rpc/types/finance/shared.types';
import type { Selectable } from 'kysely';

import { toIsoString } from './to-iso-string';

export function normalizeAccountType(value: string): AccountType {
  if (
    value === 'checking' ||
    value === 'savings' ||
    value === 'credit' ||
    value === 'investment' ||
    value === 'cash' ||
    value === 'other'
  ) {
    return value;
  }

  return 'other';
}

export function toTransactionData(
  row: Selectable<Database['finance_transactions']>,
): TransactionData {
  const amount =
    typeof row.amount === 'string' ? Number.parseFloat(row.amount) : Number(row.amount);

  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount,
    description: row.description ?? '',
    date: toIsoString(row.date),
    type: (amount < 0 ? 'expense' : 'income') as TransactionType,
  };
}
