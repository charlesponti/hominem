import type { AccountWithPlaidInfo } from '@hominem/hono-rpc/types/finance.types'

import { ManualInstitutionStatus } from './manual-institution-status'
import { NotConnectedStatus } from './not-connected-status'
import { PlaidAccountStatus } from './plaid-account-status'

interface AccountStatusDisplayProps {
  account: AccountWithPlaidInfo
  showDialog?: boolean
  onRefresh?: (() => void) | undefined
}

export function AccountStatusDisplay({ account, showDialog = true, onRefresh }: AccountStatusDisplayProps) {
  if (account.plaidItemId) {
    return <PlaidAccountStatus account={account} onRefresh={onRefresh} />
  }
  if (account.institutionName) {
    return <ManualInstitutionStatus account={account} showDialog={showDialog} />
  }
  return <NotConnectedStatus account={account} showDialog={showDialog} />
}
