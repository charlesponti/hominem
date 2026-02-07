import { useSort } from '@hominem/ui/hooks';
import { useEffect, useState } from 'react';

import { PaginationControls } from '~/components/finance/pagination-controls';
import { TransactionFilters } from '~/components/finance/transaction-filters';
import { TransactionsList } from '~/components/transactions/transactions-list';
import {
  type FilterArgs,
  useFinanceAccounts,
  useFinanceTransactions,
} from '~/lib/hooks/use-finance-data';
import { useSelectedAccount } from '~/lib/hooks/use-selected-account';

export default function TransactionsPage() {
  const { selectedAccount } = useSelectedAccount();
  const [currentFilters, setCurrentFilters] = useState<FilterArgs>({});
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  const { sortOptions, addSortOption, updateSortOption, removeSortOption } = useSort({
    initialSortOptions: [{ field: 'date', direction: 'desc' }],
  });

  useEffect(() => {
    setCurrentFilters((prev: FilterArgs) => ({
      ...prev,
      description: searchValue || undefined,
    }));
  }, [searchValue]);

  const {
    accountsMap,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useFinanceAccounts();

  const filters = {
    ...currentFilters,
    accountId: selectedAccount === 'all' ? undefined : selectedAccount,
  };

  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    totalTransactions,
  } = useFinanceTransactions({
    filters,
    sortOptions,
    page,
    limit,
  });

  const loading = accountsLoading || transactionsLoading;
  const error = accountsError || transactionsError;

  const refreshData = () => {
    refetchAccounts();
    refetchTransactions();
  };

  const totalPages = limit > 0 ? Math.ceil(totalTransactions / limit) : 0;

  return (
    <>
      <TransactionFilters
        accountsMap={accountsMap}
        accountsLoading={accountsLoading}
        filters={currentFilters}
        onFiltersChange={setCurrentFilters}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortOptions={sortOptions || []}
        addSortOption={addSortOption}
        updateSortOption={updateSortOption}
        removeSortOption={removeSortOption}
        onRefresh={refreshData}
        loading={loading}
      />

      {/* Shared Loading, Error, and Empty States */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="space-y-4 w-full">
            {[1, 2, 3, 4, 5].map((val) => (
              <div key={val} className="h-24 bg-muted rounded-md w-full md:h-12" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-destructive">
          {typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : 'An unknown error occurred'}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No transactions found.</div>
      ) : (
        <>
          <TransactionsList
            loading={transactionsLoading}
            error={transactionsError}
            transactions={transactions}
            accountsMap={accountsMap}
          />

          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
