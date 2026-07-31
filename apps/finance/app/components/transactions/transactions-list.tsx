import { EmptyState } from '@ponti-studios/ui/feedback';
import { Skeleton } from '@ponti-studios/ui/feedback';
import { Badge } from '@ponti-studios/ui/primitives';
import { CreditCard, Receipt } from 'lucide-react';

import type { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data';
import { cn } from '~/lib/utils';

const listShellClass = 'overflow-hidden rounded-3xl border border-border bg-surface shadow-xs';

type TransactionFromAPI = ReturnType<typeof useFinanceTransactions>['transactions'][number];
type AccountsMap = ReturnType<typeof useFinanceAccounts>['accountsMap'];
type AccountFromMap = NonNullable<AccountsMap> extends Map<string, infer T> ? T : never;

type TransactionsListProps = {
  loading: boolean;
  error: string | null;
  transactions: TransactionFromAPI[];
  accountsMap: AccountsMap;
};

function formatPostedOn(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TransactionAmount({ transaction }: { transaction: TransactionFromAPI }) {
  const amount = Number(transaction.amount);
  const isExpense = amount < 0;
  const displayAmount = Math.abs(amount).toFixed(2);

  return (
    <div
      className={cn(
        'tabular-nums font-semibold',
        isExpense ? 'text-destructive' : 'text-foreground',
      )}
    >
      {isExpense ? '−' : '+'}${displayAmount}
    </div>
  );
}

function TransactionListItem({
  transaction,
  account,
}: {
  transaction: TransactionFromAPI;
  account?: AccountFromMap | undefined;
}) {
  const postedOn = formatPostedOn(transaction.postedOn);
  const isExpense = Number(transaction.amount) < 0;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="heading-4 truncate text-foreground">
            {transaction.description || 'Transaction'}
          </h3>
          <Badge variant="secondary">{isExpense ? 'Expense' : 'Income'}</Badge>
        </div>
        <div className="body-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {postedOn ? <span>{postedOn}</span> : null}
          {account ? (
            <span className="inline-flex items-center gap-1">
              <CreditCard className="size-3" aria-hidden />
              {account.name}
            </span>
          ) : null}
        </div>
      </div>
      <TransactionAmount transaction={transaction} />
    </div>
  );
}

export function TransactionsList({
  loading,
  error,
  transactions,
  accountsMap,
}: TransactionsListProps) {
  if (loading) {
    return (
      <div className={listShellClass}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={`tx-skeleton-${i}`}
            className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-5"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        variant="dashed"
        title="Couldn’t load transactions"
        description={error}
        icon={<Receipt className="size-5" aria-hidden />}
      />
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        variant="search"
        title="No transactions found"
        description="Try adjusting your filters or date range."
        icon={<Receipt className="size-5" aria-hidden />}
      />
    );
  }

  return (
    <div className={listShellClass}>
      {transactions.map((transaction) => (
        <TransactionListItem
          key={transaction.id}
          transaction={transaction}
          account={accountsMap.get(transaction.accountId)}
        />
      ))}
    </div>
  );
}
