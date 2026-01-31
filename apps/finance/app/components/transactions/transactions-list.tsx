import { CreditCard, DollarSign, Tag } from 'lucide-react';

import type {
  useFinanceAccountsWithMap,
  useFinanceTransactions,
} from '~/lib/hooks/use-finance-data';

import { cn } from '~/lib/utils';

type TransactionFromAPI = ReturnType<typeof useFinanceTransactions>['transactions'][number];
type AccountsMap = ReturnType<typeof useFinanceAccountsWithMap>['accountsMap'];
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
      <div className={cn('font-semibold', isNegative ? 'text-red-600' : 'text-emerald-600')}>
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
    <div className="group border-b border-gray-200 py-4 px-2 space-y-2">
      <div className="w-full flex items-center justify-between gap-4">
        <h3 className="font-serif text-black tracking-tight">
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
      <div className="space-y-0 mx-auto border border-gray-200 rounded-lg overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => `skeleton-${Date.now()}-${i}`).map((key) => (
          <div
            key={key}
            className="p-4 sm:p-6 animate-pulse border-b border-gray-100 last:border-b-0"
          >
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
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
      <div className="p-8 text-center border border-red-200 bg-red-50 rounded-lg max-w-4xl mx-auto">
        <div className="text-red-600 font-medium">{error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center border border-gray-200 bg-gray-50 rounded-lg max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
            <DollarSign className="size-6 text-muted-foreground" />
          </div>
          <div className="text-gray-600 font-medium">No transactions found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or date range</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto border border-gray-200 rounded-lg overflow-hidden">
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
