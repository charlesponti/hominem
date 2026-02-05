import type { TransactionData } from './shared.types'

// ============================================================================
// Named Types for TransactionUpdateInput
// ============================================================================

export type TransactionUpdateData = {
  accountId?: string
  amount?: string | number
  description?: string | null
  category?: string | null
  date?: string
  merchantName?: string | null
  note?: string | null
  tags?: string | null
  excluded?: boolean | null
  recurring?: boolean | null
}

// ============================================================================
// Transactions
// ============================================================================

export type TransactionListInput = {
  from?: string
  to?: string
  category?: string
  min?: string
  max?: string
  account?: string
  limit?: number
  offset?: number
  description?: string
  search?: string
  sortBy?: string[]
  sortDirection?: ('asc' | 'desc')[]
}

export type TransactionCreateInput = {
  accountId: string
  amount: string | number
  description?: string | null
  type?: string | null
  category?: string | null
  date?: string
}

export type TransactionUpdateInput = {
  id: string
  data: TransactionUpdateData
}

export type TransactionDeleteInput = {
  id: string
}

export type TransactionListOutput = {
  data: TransactionData[]
  filteredCount: number
  totalUserCount: number
}

export type TransactionCreateOutput = TransactionData
export type TransactionUpdateOutput = TransactionData
export type TransactionDeleteOutput = { success: boolean; message?: string }
