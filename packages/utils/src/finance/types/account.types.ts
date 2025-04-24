/**
 * Finance account types
 */
import type { FinanceAccount, FinanceAccountInsert } from '../../db/schema/finance.schema'

export type { FinanceAccount, FinanceAccountInsert }

/**
 * Account metadata structure that can be stored in the meta field
 */
export interface AccountMetadata {
  logo?: string
  color?: string
  website?: string
  contactPhone?: string
  contactEmail?: string
  lastSync?: string
  syncStatus?: 'synced' | 'error' | 'pending'
  isDefault?: boolean
  isHidden?: boolean
  notes?: string
  tags?: string[]
  institutionName?: string
  [key: string]: unknown
}

/**
 * Account creation request parameters
 */
export interface CreateAccountRequest {
  name: string
  balance: string | number
  type: FinanceAccount['type']
  interestRate?: string | number
  minimumPayment?: string | number
  institutionId?: string
  meta?: AccountMetadata
}

/**
 * Account summary for UI display
 */
export interface AccountSummary {
  id: string
  name: string
  balance: string
  type: string
  meta?: AccountMetadata
}

/**
 * Account balance history entry
 */
export interface AccountBalanceHistory {
  date: string
  balance: number
}
