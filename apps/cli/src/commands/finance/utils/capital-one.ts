import type { TransactionInsert, TransactionType } from '../../../db/schema'

export interface CapitalOneTransaction {
  'Account Number': string
  'Transaction Date': string
  'Transaction Amount': string
  'Transaction Type': string
  'Transaction Description': string
  Balance: string
}

export function getCapitalOneTransactionType(type: string): TransactionType {
  return type === 'Credit' ? 'credit' : 'debit'
}

export function convertCapitalOneTransaction(t: CapitalOneTransaction): TransactionInsert {
  return {
    name: t['Transaction Description'],
    amount: Number.parseFloat(t['Transaction Amount']),
    date: new Date(t['Transaction Date']).toISOString(),
    type: getCapitalOneTransactionType(t['Transaction Type']),
    status: 'posted',
    category: 'uncategorized',
    parentCategory: 'uncategorized',
    account: `Capital One ${t['Account Number']}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
