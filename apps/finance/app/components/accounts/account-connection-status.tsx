import { Banknote } from 'lucide-react';

import type { Account } from '~/lib/types/account.types';

import { AccountStatusDisplay } from './account-status-display';

interface AccountConnectionStatusProps {
  account: Account;
  showDialog?: boolean;
}

export function AccountConnectionStatus({
  account,
  showDialog = true,
}: AccountConnectionStatusProps) {
  return <AccountStatusDisplay account={account} showDialog={showDialog} />;
}

interface AccountConnectionSummaryProps {
  accounts: Account[];
}

export function AccountConnectionSummary({ accounts }: AccountConnectionSummaryProps) {
  const connectedCount = accounts.filter((account) => account.institutionId).length;
  const plaidLinkedCount = accounts.filter((account) => account.plaidItemId).length;
  const totalCount = accounts.length;
  const connectionRate = totalCount > 0 ? Math.round((connectedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Account Connections</h3>
          <p className="text-sm text-muted-foreground">
            {connectedCount} of {totalCount} accounts connected ({connectionRate}%)
          </p>
          {plaidLinkedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              <Banknote className="size-3 inline mr-1" />
              {plaidLinkedCount} linked to Plaid accounts
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{connectedCount}</div>
          <div className="text-xs text-muted-foreground">Connected</div>
          {plaidLinkedCount > 0 && (
            <div className="text-sm font-medium text-foreground">{plaidLinkedCount} Plaid</div>
          )}
        </div>
      </div>
    </div>
  );
}
