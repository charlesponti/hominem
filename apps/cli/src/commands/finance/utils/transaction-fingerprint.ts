import { createHash } from 'node:crypto'
import type { Transaction } from '../../../db/schema'

// Transaction without account info for fingerprinting
type TransactionFingerprint = Omit<Transaction, 'account' | 'accountMask'>

// Function to generate a unique hash for a transaction based on its core properties
export function generateTransactionHash(transaction: TransactionFingerprint): string {
  // Create a fingerprint excluding account-related fields
  // Include name to ensure uniqueness but similarity will be checked separately
  const fingerprint = {
    date: transaction.date,
    amount: transaction.amount.toString(),
    type: transaction.type,
    name: transaction.name,
    recurring: !!transaction.recurring,
  }

  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex')
}
