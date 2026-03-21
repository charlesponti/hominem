import type { AccountWithPlaidInfo } from '@hominem/rpc/types/finance.types'

import { ManualInstitutionStatus } from './manual-institution-status'
import { NotConnectedStatus } from './not-connected-status'
import { PlaidAccountStatus } from './plaid-account-status'

interface AccountStatusDisplayProps {
  account: AccountWithPlaidInfo
  onRefresh?: (() => void) | undefined
}

export function AccountStatusDisplay({ account, onRefresh }: AccountStatusDisplayProps) {
  if (account.plaidItemId) {
    return <PlaidAccountStatus account={account} onRefresh={onRefresh} />
  }
  if (account.institutionName) {
    return <ManualInstitutionStatus account={account} />
  }
  return <NotConnectedStatus />
}
