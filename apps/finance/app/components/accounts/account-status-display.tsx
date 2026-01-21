import type { RouterOutput } from '~/lib/trpc';

import { ManualInstitutionStatus } from './manual-institution-status';
import { NotConnectedStatus } from './not-connected-status';
import { PlaidAccountStatus } from './plaid-account-status';

interface AccountStatusDisplayProps {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number];
  showDialog?: boolean;
  onRefresh?: () => void;
}

export function AccountStatusDisplay({
  account,
  showDialog = true,
  onRefresh,
}: AccountStatusDisplayProps) {
  if (account.plaidItemId) {
    return <PlaidAccountStatus account={account} onRefresh={onRefresh} />;
  }
  if (account.institutionId) {
    return <ManualInstitutionStatus account={account} showDialog={showDialog} />;
  }
  return <NotConnectedStatus account={account} showDialog={showDialog} />;
}
