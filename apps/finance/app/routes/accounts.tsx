import { formatCurrency } from '@hominem/utils';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  EmptyState,
  Spinner,
} from '@ponti-studios/ui/feedback';
import { SectionIntro } from '@ponti-studios/ui/layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ponti-studios/ui/primitives';
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

import { PlaidConnectButton, PlaidLink } from '~/components/plaid/plaid-link';
import { RouteLink } from '~/components/route-link';
import { createServerHonoClient } from '~/lib/api.server';
import { requireAuth } from '~/lib/guards';
import { useAllAccounts } from '~/lib/hooks/use-finance-data';
import { toast } from '~/lib/toast';

import type { Route } from './+types/accounts';

type AccountWithOptionalPlaid = ReturnType<typeof useAllAccounts>['accounts'][number];
type RawAccountWithOptionalPlaid = {
  id: string;
  userId: string;
  name: string;
  accountType: AccountWithOptionalPlaid['accountType'];
  currentBalance: number | null;
  transactions: AccountWithOptionalPlaid['transactions'];
  institutionName?: string | null | undefined;
  plaidAccountId?: string | null | undefined;
  plaidItemId?: string | null | undefined;
};

function normalizeAccount(account: RawAccountWithOptionalPlaid): AccountWithOptionalPlaid {
  const normalized: AccountWithOptionalPlaid = {
    id: account.id,
    userId: account.userId,
    name: account.name,
    accountType: account.accountType,
    currentBalance: account.currentBalance,
    transactions: account.transactions,
  };
  if (account.institutionName !== undefined) {
    normalized.institutionName = account.institutionName;
  }
  if (account.plaidAccountId !== undefined) {
    normalized.plaidAccountId = account.plaidAccountId;
  }
  if (account.plaidItemId !== undefined) {
    normalized.plaidItemId = account.plaidItemId;
  }
  return normalized;
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
  const { finance } = createServerHonoClient(request);

  const data = await finance.accounts.all
    .$get({ query: {} })
    .then((r) => r.json())
    .catch(() => ({ accounts: [], connections: [] }));

  return data;
}

function AccountCard({
  account,
}: {
  account: ReturnType<typeof useAllAccounts>['accounts'][number];
}) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const isPlaidAccount = Boolean(account.plaidItemId);

  const typeIcon =
    account.accountType.toLowerCase() === 'credit' ? (
      <CreditCard className="size-4" aria-hidden />
    ) : (
      <Building2 className="size-4" aria-hidden />
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-muted p-1.5 text-foreground">{typeIcon}</div>
            <div className="min-w-0">
              <CardTitle>{account.name}</CardTitle>
              <CardDescription>
                {account.institutionName && isPlaidAccount
                  ? account.institutionName
                  : `${account.accountType.charAt(0).toUpperCase()}${account.accountType.slice(1)}`}
              </CardDescription>
            </div>
          </div>
          {isPlaidAccount ? <Badge variant="secondary">Connected</Badge> : null}
        </div>
      </CardHeader>

      <CardContent>
        {account.currentBalance != null ? (
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="body-3 text-muted-foreground">Balance</p>
              <p className="heading-3 tabular-nums text-foreground">
                {isBalanceVisible ? formatCurrency(Number(account.currentBalance)) : '••••••'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              aria-label={isBalanceVisible ? 'Hide balance' : 'Show balance'}
            >
              {isBalanceVisible ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        ) : (
          <p className="body-3 text-muted-foreground">No balance on file</p>
        )}
      </CardContent>

      <CardFooter>
        <span className="body-3 text-muted-foreground">
          {isPlaidAccount ? 'Plaid connected' : 'Manual account'}
        </span>
        <Button variant="outline" size="sm" asChild>
          <RouteLink to={`/accounts/${account.id}`}>
            <ExternalLink className="size-4" aria-hidden />
            Details
          </RouteLink>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AccountsPage({ loaderData }: Route.ComponentProps) {
  const { accounts: initialAccounts, connections: initialConnections } = loaderData;

  const allAccountsQuery = useAllAccounts({
    initialData: {
      accounts: initialAccounts.map(normalizeAccount),
      connections: initialConnections,
    },
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

  const sortedAccounts = (allAccountsQuery.accounts || []).sort((a, b) => {
    if (a.plaidItemId && !b.plaidItemId) return -1;
    if (!a.plaidItemId && b.plaidItemId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro
        title="Accounts"
        description="Manage connected banks and financial data sources."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => allAccountsQuery.refetch()}
              disabled={isLoading}
            >
              <RefreshCcw className="size-4" aria-hidden />
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
              Add bank
            </PlaidConnectButton>
          </div>
        }
      />

      {hasError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>
            {allAccountsQuery.error?.message || 'Failed to load banking data'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" />
        </div>
      ) : null}

      {!isLoading && !hasAccounts && !hasError ? (
        <EmptyState
          variant="dashed"
          title="No bank accounts"
          description="Connect your bank accounts to import transactions and understand your spending."
          icon={<Building2 className="size-5" aria-hidden />}
          action={
            <PlaidLink
              variant="card"
              onSuccess={handleConnectionSuccess}
              onError={handleConnectionError}
            />
          }
        />
      ) : null}

      {hasAccounts ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-4 text-foreground">Your accounts</h2>
            <Badge variant="secondary">{allAccountsQuery.accounts.length} accounts</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {sortedAccounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
