import {
  type FinanceTransactionInput,
  type TransactionType,
  TransactionTypes,
} from '@hominem/db/types/finance';
import crypto from 'node:crypto';

export interface CapitalOneTransaction {
  'Account Number': string;
  'Transaction Date': string;
  'Transaction Amount': string;
  'Transaction Type': string;
  'Transaction Description': string;
  Balance: string;
}

/**
 * !TODO: Convert to Map and create generate conversion function that takes the `bankName` and `type` and returns the correct TransactionType
 */
export function getCapitalOneTransactionType(type: string): TransactionType {
  switch (type.toLowerCase()) {
    case 'credit':
      return TransactionTypes.credit;
    case 'debit':
      return TransactionTypes.debit;
    case 'transfer':
      return TransactionTypes.transfer;
    default:
      return TransactionTypes.debit;
  }
}

export function convertCapitalOneTransaction(
  t: CapitalOneTransaction,
  accountId: string,
  userId: string,
): FinanceTransactionInput {
  return {
    id: crypto.randomUUID(),
    type: getCapitalOneTransactionType(t['Transaction Type']),
    amount: t['Transaction Amount'],
    date: new Date(t['Transaction Date']),
    description: t['Transaction Description'],
    accountId,
    status: 'posted',
    category: 'uncategorized',
    parentCategory: 'uncategorized',
    accountMask: t['Account Number'].slice(-4),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId,
  };
}
