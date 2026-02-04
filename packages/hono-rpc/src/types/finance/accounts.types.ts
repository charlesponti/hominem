import type { AccountWithPlaidInfo } from './shared.types'
import type { AccountData, PlaidConnection, TransactionData } from './shared.types'

// ============================================================================
// Accounts
// ============================================================================

export type AccountListInput = {
  includeInactive?: boolean
}

export type AccountGetInput = {
  id: string
}

export type AccountCreateInput = {
  name: string
  type: string
  balance?: number | string
  institution?: string
  institutionId?: string
}

export type AccountUpdateInput = {
  id: string
  name?: string
  type?: string
  balance?: number | string
  institution?: string
  institutionId?: string
}

export type AccountDeleteInput = {
  id: string
}

export type AccountInstitutionAccountsInput = {
  institutionId: string
}

export type AccountListOutput = AccountData[]

export type AccountGetOutput = AccountWithPlaidInfo & {
  transactions: TransactionData[]
}

export type AccountCreateOutput = AccountData
export type AccountUpdateOutput = AccountData
export type AccountDeleteOutput = { success: true }

export type AccountAllOutput = {
  accounts: (AccountWithPlaidInfo & { transactions: TransactionData[] })[]
  connections: PlaidConnection[]
}

export type AccountsWithPlaidOutput = AccountWithPlaidInfo[]
export type AccountConnectionsOutput = PlaidConnection[]
export type AccountInstitutionAccountsOutput = AccountWithPlaidInfo[]
