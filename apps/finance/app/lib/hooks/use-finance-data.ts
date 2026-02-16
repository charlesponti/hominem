import type { SortOption } from '@hominem/ui/hooks';

import { format } from 'date-fns';
import { useMemo } from 'react';

import { useHonoQuery } from '~/lib/api';

export interface FilterArgs {
  accountId?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  description?: string | undefined;
}

export interface UseFinanceAccountsOptions {
  initialData?: any;
}

export const useFinanceAccounts = ({ initialData }: UseFinanceAccountsOptions = {}) => {
  const { data, isLoading, error, refetch } = useHonoQuery(
    ['finance', 'accounts', 'list'],
    async (client) => {
      const res = await client.api.finance.accounts.list.$post({
        json: { includeInactive: false },
      });
      return res.json();
    },
    initialData ? { initialData: initialData as any } : {},
  );

  const accountsData = (Array.isArray(data) ? data : []) as typeof data;

  const accountsMap = useMemo(() => {
    if (!Array.isArray(accountsData)) {
      return new Map<string, any>();
    }
    return new Map(accountsData.map((account: any) => [account.id, account]));
  }, [accountsData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    accountsMap,
  };
};

export const useFinancialInstitutions = () =>
  useHonoQuery(['finance', 'institutions', 'list'], async (client) => {
    const res = await client.api.finance.institutions.list.$post({ json: {} });
    return res.json();
  });

// Hook that adds value by transforming data for unified view
export function useAllAccounts(options?: { initialData?: any }) {
  const allAccountsQuery = useHonoQuery(
    ['finance', 'accounts', 'all'],
    async (client) => {
      const res = await client.api.finance.accounts.all.$post({ json: {} });
      return res.json();
    },
    options?.initialData ? { initialData: options.initialData } : {},
  );

  const result = allAccountsQuery.data;

  return {
    isLoading: allAccountsQuery.isLoading,
    error: allAccountsQuery.error,
    refetch: allAccountsQuery.refetch,
    accounts: result?.accounts ?? [],
    connections: result?.connections ?? [],
  };
}

export function useAccountById(id: string, options?: { initialData?: any }) {
  const accountQuery = useHonoQuery(
    ['finance', 'accounts', 'get', id],
    async (client) => {
      const res = await client.api.finance.accounts.get.$post({
        json: { id },
      });
      return res.json();
    },
    {
      enabled: !!id,
      ...(options?.initialData ? { initialData: options.initialData } : {}),
    },
  );

  const account = accountQuery.data;

  return {
    ...accountQuery,
    account,
  };
}

export interface UseFinanceTransactionsOptions {
  filters?: FilterArgs;
  sortOptions?: SortOption[];
  page?: number;
  limit?: number;
  initialData?: any;
}

// Hook that adds value through complex state management and data transformation
export function useFinanceTransactions({
  filters = {},
  sortOptions = [{ field: 'date', direction: 'desc' }],
  page = 0,
  limit = 25,
  initialData,
}: UseFinanceTransactionsOptions = {}) {
  // Convert sort options to API format
  const sortBy = useMemo(() => {
    return sortOptions[0]?.field || 'date';
  }, [sortOptions]);

  const sortOrder = useMemo(() => {
    return sortOptions[0]?.direction || 'desc';
  }, [sortOptions]);

  const offset = page * limit;

  const queryOptions: any = {
    staleTime: 1 * 60 * 1000,
  };
  
  if (initialData) {
    queryOptions.initialData = initialData;
  }

  const query = useHonoQuery(
    [
      'finance',
      'transactions',
      'list',
      {
        filters,
        sortBy,
        sortOrder,
        offset,
        limit,
      },
    ],
    async (client) => {
      const res = await client.api.finance.transactions.list.$post({
        json: {
          dateFrom: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
          dateTo: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
          account: filters.accountId && filters.accountId !== 'all' ? filters.accountId : undefined,
          description: filters.description,
          limit,
          offset,
          sortBy,
          sortDirection: sortOrder as 'asc' | 'desc',
        },
      });
      return res.json();
    },
    queryOptions,
  );

  const result = query.data;

  return {
    transactions: Array.isArray(result?.data) ? result.data : [],
    totalTransactions: result?.filteredCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
