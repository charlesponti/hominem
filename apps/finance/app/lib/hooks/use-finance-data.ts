import type {
  AccountListOutput,
  AccountGetOutput,
  AccountAllOutput,
  TransactionListOutput,
  InstitutionsListOutput,
} from '@hominem/hono-rpc/types/finance.types';
import type { ApiResult } from '@hominem/services';
import type { SortOption } from '@hominem/ui/hooks';

import { format } from 'date-fns';
import { useMemo } from 'react';

import { useHonoQuery } from '~/lib/hono';

// Derive filter args from input schema where possible
export interface FilterArgs {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  description?: string;
}

export const useFinanceAccounts = () =>
  useHonoQuery<ApiResult<AccountListOutput>>(['finance', 'accounts', 'list'], async (client) => {
    const res = await client.api.finance.accounts.list.$post({
      json: { includeInactive: false },
    });
    return res.json() as Promise<ApiResult<AccountListOutput>>;
  });

export const useFinancialInstitutions = () =>
  useHonoQuery<ApiResult<InstitutionsListOutput>>(
    ['finance', 'institutions', 'list'],
    async (client) => {
      const res = await client.api.finance.institutions.list.$post({ json: {} });
      return res.json() as Promise<ApiResult<InstitutionsListOutput>>;
    },
  );

type Account = AccountListOutput[number];
type TransformedAccount = Omit<Account, 'createdAt' | 'updatedAt' | 'lastUpdated'> & {
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date | null;
};

export function useFinanceAccountsWithMap() {
  const accountsQuery = useFinanceAccounts();
  const result = accountsQuery.data;
  const accounts = result?.success ? result.data : [];

  // Transform accounts to convert string dates to Date objects
  const transformedAccounts = useMemo<TransformedAccount[]>(() => {
    if (!Array.isArray(accounts)) return [];
    return accounts.map((account) => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
      lastUpdated: account.lastUpdated ? new Date(account.lastUpdated) : null,
    }));
  }, [accounts]);

  const accountsMap = useMemo(() => {
    return new Map<string, TransformedAccount>(
      transformedAccounts.map((account) => [account.id, account]),
    );
  }, [transformedAccounts]);

  return {
    ...accountsQuery,
    accounts: transformedAccounts,
    accountsMap,
  };
}

// Hook that adds value by transforming data for unified view
export function useAllAccounts() {
  const allAccountsQuery = useHonoQuery<ApiResult<AccountAllOutput>>(
    ['finance', 'accounts', 'all'],
    async (client) => {
      const res = await client.api.finance.accounts.all.$post({ json: {} });
      return res.json() as Promise<ApiResult<AccountAllOutput>>;
    },
  );

  const result = allAccountsQuery.data;
  const data = result?.success ? result.data : null;

  return {
    isLoading: allAccountsQuery.isLoading,
    error: allAccountsQuery.error,
    refetch: allAccountsQuery.refetch,
    accounts: data?.accounts || [],
    connections: data?.connections || [],
    apiError: result?.success === false ? result : null,
  };
}

export function useAccountById(id: string) {
  const accountQuery = useHonoQuery<ApiResult<AccountGetOutput>>(
    ['finance', 'accounts', 'get', id],
    async (client) => {
      const res = await client.api.finance.accounts.get.$post({
        json: { id },
      });
      return res.json() as Promise<ApiResult<AccountGetOutput>>;
    },
    { enabled: !!id },
  );

  const result = accountQuery.data;
  const account = result?.success ? result.data : undefined;

  return {
    ...accountQuery,
    account,
    apiError: result?.success === false ? result : null,
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
  // Convert sort options to API format
  const sortBy = useMemo(() => {
    return sortOptions[0]?.field || 'date';
  }, [sortOptions]);

  const sortOrder = useMemo(() => {
    return sortOptions[0]?.direction || 'desc';
  }, [sortOptions]);

  const offset = page * limit;

  const query = useHonoQuery<ApiResult<TransactionListOutput>>(
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
          from: filters.dateFrom ? format(filters.dateFrom, 'yyyy-MM-dd') : undefined,
          to: filters.dateTo ? format(filters.dateTo, 'yyyy-MM-dd') : undefined,
          account: filters.accountId && filters.accountId !== 'all' ? filters.accountId : undefined,
          description: filters.description,
          limit,
          offset,
          sortBy: [sortBy],
          sortDirection: [sortOrder as 'asc' | 'desc'],
        },
      });
      return res.json() as Promise<ApiResult<TransactionListOutput>>;
    },
    {
      staleTime: 1 * 60 * 1000,
    },
  );

  const result = query.data;
  const data = result?.success ? result.data : null;

  return {
    transactions: data?.data || [],
    totalTransactions: data?.filteredCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    apiError: result?.success === false ? result : null,
  };
}

// Export types that match the old finance-types structure
export type AccountsListOutput = AccountListOutput;
export type AccountsGetOutput = AccountGetOutput;
export type AccountsAllOutput = AccountAllOutput;
export type AccountsAccountsOutput = AccountListOutput;
export type AccountsConnectionsOutput = AccountAllOutput['connections'];
export type TransactionsListOutput = TransactionListOutput;
