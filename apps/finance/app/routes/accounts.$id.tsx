import type { AccountGetOutput } from '@hominem/rpc/finance';
import { Alert, AlertDescription, AlertTitle } from '@ponti-studios/ui/feedback';
import { Badge } from '@ponti-studios/ui/primitives';
import { RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { redirect, useParams } from 'react-router';

import { AccountHeader } from '~/components/accounts/account-header';
import { AccountSpendingChart } from '~/components/accounts/account-spending-chart';
import { TransactionsList } from '~/components/transactions/transactions-list';
import { createServerHonoClient } from '~/lib/api.server';
import { requireAuth } from '~/lib/guards';
import { useAccountById, useFinanceTransactions } from '~/lib/hooks/use-finance-data';

import type { Route } from './+types/accounts.$id';

function normalizeInitialAccount(account: {
  id: string;
  userId: string;
  name: string;
  accountType: AccountGetOutput['accountType'];
  currentBalance: number | null;
  transactions: AccountGetOutput['transactions'];
  institutionName?: string | null | undefined;
  plaidAccountId?: string | null | undefined;
  plaidItemId?: string | null | undefined;
}): AccountGetOutput {
  const normalized: AccountGetOutput = {
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  if (!id) {
    return redirect('/accounts');
  }

  await requireAuth(request);
  const { finance } = createServerHonoClient(request);

  const [account, transactionsResult] = await Promise.all([
    finance.accounts.get.$get({ query: { id } }).then((r) => r.json()),
    finance.transactions.list.$get({ query: { account: id, limit: '50' } }).then((r) => r.json()),
  ]);

  return {
    account,
    transactionsResult,
  };
}

export default function AccountDetailsPage({ loaderData }: Route.ComponentProps) {
  const { id } = useParams();
  const accountId = id ?? '';
  const { account: initialAccount, transactionsResult: initialTransactionsResult } = loaderData;
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Get account details
  const {
    account,
    isLoading: accountLoading,
    error: accountError,
    refetch: refetchAccount,
  } = useAccountById(
    accountId,
    initialAccount ? { initialData: normalizeInitialAccount(initialAccount) } : undefined,
  );

  // Create a map with a single account for the TransactionsList component
  const accountsMap = useMemo(() => {
    if (!account) return new Map();
    return new Map([[account.id, account]]);
  }, [account]);

  // Get transactions for this specific account
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useFinanceTransactions({
    filters: { accountId },
    limit: 50,
    initialData: initialTransactionsResult,
  });

  const isLoading = accountLoading || transactionsLoading;
  const hasError = accountError || transactionsError;

  const refreshData = async () => {
    await Promise.all([refetchAccount(), refetchTransactions()]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCcw className="size-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading account details...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Account</AlertTitle>
        <AlertDescription>
          {accountError instanceof Error
            ? accountError.message
            : transactionsError instanceof Error
              ? transactionsError.message
              : 'Failed to load account data'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertTitle>Account Not Found</AlertTitle>
          <AlertDescription>
            The account you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountHeader
        account={account}
        isBalanceVisible={isBalanceVisible}
        onToggleBalance={() => setIsBalanceVisible(!isBalanceVisible)}
        onRefresh={refreshData}
        isLoading={isLoading}
      />

      <AccountSpendingChart accountId={accountId} accountName={account.name} />

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <Badge variant="secondary">{initialTransactionsResult.filteredCount} total</Badge>
        </div>

        <TransactionsList
          loading={transactionsLoading}
          error={transactionsError}
          transactions={
            transactions.length > 0 ? transactions : (initialTransactionsResult.data ?? [])
          }
          accountsMap={accountsMap}
        />
      </div>
    </div>
  );
}
