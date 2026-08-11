import { formatCurrency } from '@hominem/utils';
import { Badge } from '@ponti-studios/ui/primitives';
import { Button } from '@ponti-studios/ui/primitives';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ponti-studios/ui/primitives';
import { Building2, CreditCard, Eye, EyeOff, RefreshCcw } from 'lucide-react';

import type { Account } from '~/lib/types/account.types';

import { AccountConnectionDialog } from './account-connection-dialog';
import { AccountStatusDisplay } from './account-status-display';

interface AccountHeaderProps {
  account: Account;
  isBalanceVisible: boolean;
  onToggleBalance: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function AccountHeader({
  account,
  isBalanceVisible,
  onToggleBalance,
  onRefresh,
  isLoading,
}: AccountHeaderProps) {
  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="size-6" />;
      default:
        return <Building2 className="size-6" />;
    }
  };

  const isPlaidAccount = ('isPlaidConnected' in account && account.isPlaidConnected) || false;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCcw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted">{getAccountTypeIcon(account.accountType)}</div>
              <div>
                <CardTitle className="text-xl">{account.name}</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
                  </Badge>
                  {isPlaidAccount && <Badge variant="secondary">Connected via Plaid</Badge>}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Balance for Plaid accounts */}
          {isPlaidAccount && account.currentBalance && (
            <div className="flex items-center justify-between p-4 bg-muted/50 ">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
                <span className="text-2xl font-bold">
                  {isBalanceVisible ? formatCurrency(Number(account.currentBalance)) : '••••••'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onToggleBalance}>
                {isBalanceVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          )}

          {/* Connection Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Connection Management</h3>
              <AccountConnectionDialog
                account={account}
                trigger={
                  <Button variant="outline" size="sm">
                    Manage Connection
                  </Button>
                }
              />
            </div>

            {/* Connection Status */}
            <AccountStatusDisplay account={account} onRefresh={onRefresh} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
