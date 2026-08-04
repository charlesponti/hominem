import { EmptyState } from '@ponti-studios/ui/feedback';
import { Skeleton } from '@ponti-studios/ui/feedback';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { PaginationControls } from '@ponti-studios/ui/navigation';
import { buttonVariants } from '@ponti-studios/ui/primitives';
import { Receipt, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { TransactionFilters } from '~/components/finance/transaction-filters';
import { TransactionsList } from '~/components/transactions/transactions-list';
import { createServerHonoClient } from '~/lib/api.server';
import { requireAuth } from '~/lib/guards';
import {
  type FilterArgs,
  useFinanceAccounts,
  useFinanceTransactions,
} from '~/lib/hooks/use-finance-data';
import { useSelectedAccount } from '~/lib/hooks/use-selected-account';
import { useSort } from '~/lib/hooks/use-sort';

import type { Route } from './+types/finance';

export async function loader({ request }: Route.LoaderArgs) {
  await requireAuth(request);
  const { finance } = createServerHonoClient(request);

  const [accountsRes, transactionsRes] = await Promise.all([
    finance.accounts.list
      .$get({ query: {} })
      .then((r) => r.json())
      .catch(() => []),
    finance.transactions.list
      .$get({ query: { limit: '25' } })
      .then((r) => r.json())
      .catch(() => ({
        data: [],
        filteredCount: 0,
        totalUserCount: 0,
      })),
  ]);

  return {
    accounts: accountsRes,
    transactions: transactionsRes,
  };
}

export default function TransactionsPage({ loaderData }: Route.ComponentProps) {
  const { accounts: initialAccounts, transactions: initialTransactions } = loaderData;
  const { selectedAccounts } = useSelectedAccount();
  const [currentFilters, setCurrentFilters] = useState<FilterArgs>({});
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  const { sortOptions, isDefaultSort, addSortOption, updateSortOption, removeSortOption } = useSort(
    {
      initialSortOptions: [{ field: 'date', direction: 'desc' }],
    },
  );

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
  } = useFinanceAccounts({
    initialData: initialAccounts,
  });

  const filters = {
    ...currentFilters,
    accountIds: selectedAccounts.length > 0 ? selectedAccounts : undefined,
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
    initialData: initialTransactions,
  });

  const loading = accountsLoading || transactionsLoading;
  const error = accountsError || transactionsError;

  const refreshData = () => {
    refetchAccounts();
    refetchTransactions();
  };

  const totalPages = limit > 0 ? Math.ceil(totalTransactions / limit) : 0;
  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : error
          ? 'An unknown error occurred'
          : null;

  return (
    <div className="flex flex-col gap-6">
      <SectionIntro
        title="Transactions"
        description="Search, filter, and review activity across your accounts."
        actions={
          <Link to="/import" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <UploadCloud className="size-4" aria-hidden />
            Import
          </Link>
        }
      />

      <TransactionFilters
        accountsMap={accountsMap}
        accountsLoading={accountsLoading}
        filters={currentFilters}
        onFiltersChange={setCurrentFilters}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        sortOptions={sortOptions || []}
        isDefaultSort={isDefaultSort}
        addSortOption={addSortOption}
        updateSortOption={updateSortOption}
        removeSortOption={removeSortOption}
        onRefresh={refreshData}
        loading={loading}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={`page-skeleton-${i}`} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : errorMessage ? (
        <EmptyState
          variant="dashed"
          title="Couldn’t load transactions"
          description={errorMessage}
          icon={<Receipt className="size-5" aria-hidden />}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          variant="search"
          title="No transactions found"
          description="Connect an account or import a CSV to get started. You can also clear filters if results look empty."
          icon={<Receipt className="size-5" aria-hidden />}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/accounts" className={buttonVariants({ size: 'sm' })}>
                Connect accounts
              </Link>
              <Link to="/import" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Import CSV
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="body-3 flex items-center justify-between text-muted-foreground">
            <span>
              {totalTransactions.toLocaleString()} transaction
              {totalTransactions === 1 ? '' : 's'}
            </span>
            {totalPages > 1 ? (
              <span>
                Page {page + 1} of {totalPages}
              </span>
            ) : null}
          </div>

          <TransactionsList
            loading={false}
            error={null}
            transactions={transactions}
            accountsMap={accountsMap}
          />

          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
