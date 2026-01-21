import { format } from 'date-fns';
import { useMemo } from 'react';

import { trpc } from '~/lib/trpc';

import type { SortOption } from './use-sort';

// Derive filter args from tRPC input schema where possible
export interface FilterArgs {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  description?: string;
}

export const useFinanceAccounts = () =>
  trpc.finance.accounts.list.useQuery({ includeInactive: false });

export const useFinancialInstitutions = () => trpc.finance.institutions.list.useQuery();

export function useFinanceAccountsWithMap() {
  const accountsQuery = useFinanceAccounts();

  // Transform accounts to convert string dates to Date objects
  const transformedAccounts = useMemo(() => {
    return (accountsQuery.data || []).map((account) => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
      lastUpdated: account.lastUpdated ? new Date(account.lastUpdated) : null,
    }));
  }, [accountsQuery.data]);

  const accountsMap = useMemo(() => {
    return new Map(transformedAccounts.map((account) => [account.id, account]));
  }, [transformedAccounts]);

  return {
    ...accountsQuery,
    accounts: transformedAccounts,
    accountsMap,
  };
}

// Hook that adds value by transforming data for unified view
export function useAllAccounts() {
  const allAccountsQuery = trpc.finance.accounts.all.useQuery();

  return {
    isLoading: allAccountsQuery.isLoading,
    error: allAccountsQuery.error,
    refetch: allAccountsQuery.refetch,
    accounts: allAccountsQuery.data?.accounts || [],
    connections: allAccountsQuery.data?.connections || [],
  };
}

export function useAccountById(id: string) {
  const accountQuery = trpc.finance.accounts.get.useQuery({ id }, { enabled: !!id });

  return {
    ...accountQuery,
    account: accountQuery.data,
  };
}

export interface UseFinanceTransactionsOptions {
  filters?: FilterArgs;
  sortOptions?: SortOption[];
  page?: number;
  limit?: number;
}

// Hook that adds value through complex state management and data transformation
export function useFinanceTransactions({
  filters = {},
  sortOptions = [{ field: 'date', direction: 'desc' }],
  page = 0,
  limit = 25,
}: UseFinanceTransactionsOptions = {}) {
  // Convert sort options to tRPC format
  const sortBy = useMemo(() => {
    return sortOptions[0]?.field || 'date';
  }, [sortOptions]);

  const sortOrder = useMemo(() => {
    return sortOptions[0]?.direction || 'desc';
  }, [sortOptions]);

  const offset = page * limit;

  const { data, isLoading, error, refetch } = trpc.finance.transactions.list.useQuery(
    {
      from: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
      to: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
      account: filters.accountId && filters.accountId !== 'all' ? filters.accountId : undefined,
      description: filters.description,
      limit,
      offset,
      sortBy: sortBy as 'date' | 'amount' | 'description',
      sortDirection: sortOrder as 'asc' | 'desc',
    },
    {
      staleTime: 1 * 60 * 1000,
    },
  );

  // Return the data directly from tRPC
  const transactions = data?.data || [];
  const totalTransactions = data?.filteredCount || 0;

  return {
    transactions,
    totalTransactions,
    isLoading,
    error,
    refetch,
  };
}
