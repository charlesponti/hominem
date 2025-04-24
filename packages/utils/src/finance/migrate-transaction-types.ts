/**
 * This file provides backward compatibility for the Transaction to FinanceTransaction rename
 * It allows existing code to continue working while new code should use the new names
 */

import type { 
  FinanceTransaction, 
  FinanceTransactionInsert 
} from '../db/schema/finance.schema'

// For backward compatibility
export type Transaction = FinanceTransaction
export type TransactionInsert = FinanceTransactionInsert

// Export a helper to check if we need to deprecate any usage
export function isDeprecatedTransactionTypeUsage(): boolean {
  // This function is used to detect usage of the old type names
  // It will always return true to flag any usage
  return true
}

// Export the conversions for documentation purposes
export const typeConversions = {
  'Transaction': 'FinanceTransaction',
  'TransactionInsert': 'FinanceTransactionInsert'
}