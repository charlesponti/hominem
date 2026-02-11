import { CreditCard, DollarSign, Tag } from 'lucide-react';

import type { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data';

import { cn } from '~/lib/utils';

type TransactionFromAPI = ReturnType<typeof useFinanceTransactions>['transactions'][number];
type AccountsMap = ReturnType<typeof useFinanceAccounts>['accountsMap'];
type AccountFromMap = NonNullable<AccountsMap> extends Map<string, infer T> ? T : never;

type TransactionsListProps = {
  loading: boolean;
  error: string | null;
  transactions: TransactionFromAPI[];
  accountsMap: AccountsMap;
};

function TransactionAmount({ transaction }: { transaction: TransactionFromAPI }) {
  const amount = Number(transaction.amount);
  const isNegative = amount < 0;
  const displayAmount = Math.abs(amount).toFixed(2);

  return (
    <div className="text-right">
      <div className={cn('font-semibold', isNegative ? 'text-destructive' : 'text-foreground')}>
        ${displayAmount}
      </div>
    </div>
  );
}

function TransactionMetadata({
  transaction,
  account,
}: {
  transaction: TransactionFromAPI;
  account?: AccountFromMap | undefined;
}) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      {account && (
        <div className="flex items-center gap-1">
          <CreditCard className="size-3" />
          <span>{account.name}</span>
        </div>
      )}
      {transaction.category && (
        <div className="flex items-center gap-1">
          <Tag className="size-3" />
          <span>{transaction.category}</span>
        </div>
      )}
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
  return (
    <div className="group border-b border-border py-4 px-2 space-y-2">
      <div className="w-full flex items-center justify-between gap-4">
        <h3 className=" text-black tracking-tight">
          {transaction.description || 'Transaction'}
        </h3>
        <TransactionAmount transaction={transaction} />
      </div>
      <TransactionMetadata transaction={transaction} account={account} />
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
      <div className="space-y-0 mx-auto border border-border overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => `skeleton-${Date.now()}-${i}`).map((key) => (
          <div key={key} className="p-4 sm:p-6 border-b border-muted last:border-b-0">
            <div className="flex items-start gap-4">
              <div className="size-12 bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted w-1/2" />
                  <div className="h-4 bg-muted w-16" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 bg-muted w-20" />
                  <div className="h-3 bg-muted w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center border border-destructive/50 bg-destructive/10 max-w-4xl mx-auto">
        <div className="text-destructive font-medium">{error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center border border-border bg-muted max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 bg-muted flex items-center justify-center">
            <DollarSign className="size-6 text-muted-foreground" />
          </div>
          <div className="text-muted-foreground font-medium">No transactions found</div>
          <div className="text-sm text-muted-foreground">
            Try adjusting your filters or date range
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto border border-border overflow-hidden">
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
