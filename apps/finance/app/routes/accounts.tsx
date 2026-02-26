import { toast } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@hominem/ui/components/ui/alert';
import { Badge } from '@hominem/ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCcw,
} from 'lucide-react';
import { useState } from 'react';
import { redirect } from 'react-router';

import { PlaidConnectButton, PlaidLink } from '~/components/plaid/plaid-link';
import { RouteLink } from '~/components/route-link';
import { createServerHonoClient } from '~/lib/api.server';
import { requireAuth } from '~/lib/guards';
import { useAllAccounts } from '~/lib/hooks/use-finance-data';

import type { Route } from './+types/accounts';

export async function loader({ request }: Route.LoaderArgs) {
  const authResult = await requireAuth(request);
  if (!authResult.user) {
    return redirect('/auth/signin');
  }

  const client = createServerHonoClient(authResult.user.id, request);

  const res = await client.api.finance.accounts.all.$post({ json: {} });
  const data = res.ok ? await res.json() : { accounts: [], connections: [] };

  return data;
}

// Simple account card for overview
function AccountCard({
  account,
}: {
  account: ReturnType<typeof useAllAccounts>['accounts'][number];
}) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const isPlaidAccount = account.isPlaidConnected || false;

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="size-4" />;
      default:
        return <Building2 className="size-4" />;
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance);
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-muted">{getAccountTypeIcon(account.type)}</div>
            <div>
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <CardDescription>
                {account.institutionName && isPlaidAccount
                  ? `${account.institutionName}${account.mask ? ` •••• ${account.mask}` : ''}`
                  : `${account.type.charAt(0).toUpperCase() + account.type.slice(1)}`}
              </CardDescription>
            </div>
          </div>
          {isPlaidAccount && (
            <Badge variant="secondary" className="text-foreground bg-muted border-border">
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-4">
          {/* Balance display */}
          {account.balance && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Balance:</span>
                <span className="font-semibold">
                  {isBalanceVisible ? formatBalance(Number(account.balance)) : '••••••'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              >
                {isBalanceVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/50 p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {isPlaidAccount ? 'Plaid Connected' : 'Manual Account'}
        </div>
        <Button variant="outline" size="sm" asChild>
          <RouteLink to={`/accounts/${account.id}`}>
            <ExternalLink className="size-4 mr-2" />
            View Details
          </RouteLink>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AccountsPage({ loaderData }: Route.ComponentProps) {
  const { accounts: initialAccounts, connections: initialConnections } = loaderData;

  const allAccountsQuery = useAllAccounts({
    initialData: { accounts: initialAccounts, connections: initialConnections },
  });

  const handleConnectionSuccess = (institutionName: string) => {
    toast({
      title: 'Bank Connected!',
      description: `Successfully connected to ${institutionName}. Your accounts will appear shortly.`,
    });
  };

  const handleConnectionError = (error: Error) => {
    toast({
      title: 'Connection Failed',
      description: error.message || 'Failed to connect bank account. Retry.',
      variant: 'destructive',
    });
  };

  const isLoading = allAccountsQuery.isLoading;
  const hasError = allAccountsQuery.error;
  const hasAccounts = (allAccountsQuery.accounts || []).length > 0;

  // Sort accounts to show Plaid-connected accounts first, then manual accounts
  const sortedAccounts = (allAccountsQuery.accounts || []).sort((a, b) => {
    if (a.isPlaidConnected && !b.isPlaidConnected) return -1;
    if (!a.isPlaidConnected && b.isPlaidConnected) return 1;
    return a.name.localeCompare(b.name);
  });

  const refreshData = async () => {
    await allAccountsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your connected bank accounts and financial data sources
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCcw className="size-4 mr-2" />
            Refresh
          </Button>
          <PlaidConnectButton
            variant="default"
            onSuccess={handleConnectionSuccess}
            onError={(e: Error | unknown) =>
              e instanceof Error
                ? handleConnectionError(e)
                : handleConnectionError(new Error('Unknown error'))
            }
          >
            Add Bank Account
          </PlaidConnectButton>
        </div>
      </div>

      {hasError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {allAccountsQuery.error?.message || 'Failed to load banking data'}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCcw className="size-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading your bank accounts...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hasAccounts && !hasError && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted mb-4">
              <Building2 className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Bank Accounts</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Connect your bank accounts to automatically import transactions and get insights into
              your finances.
            </p>
            <PlaidLink
              variant="card"
              onSuccess={handleConnectionSuccess}
              onError={handleConnectionError}
            />
          </CardContent>
        </Card>
      )}

      {/* Accounts Section */}
      {hasAccounts && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Accounts</h2>
            <Badge variant="secondary">{allAccountsQuery.accounts.length} accounts</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sortedAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
