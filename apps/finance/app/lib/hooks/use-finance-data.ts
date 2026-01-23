import type { AppRouter } from '@hominem/trpc';
import type { SortOption } from '@hominem/ui/hooks';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCQueryResult } from '@trpc/react-query/shared';

import { format } from 'date-fns';
import { useMemo } from 'react';

import type { RouterOutput } from '~/lib/trpc';
import type {
  AccountsListOutput,
  AccountsAllOutput,
  AccountsAccountsOutput,
  AccountsConnectionsOutput,
  InstitutionsListOutput,
  TransactionsListOutput,
} from '~/lib/trpc/finance-types';

import { trpc } from '~/lib/trpc';

// Derive filter args from tRPC input schema where possible
export interface FilterArgs {
  accountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  description?: string;
}

type TRPCError = TRPCClientErrorLike<AppRouter>;

export const useFinanceAccounts = (): UseTRPCQueryResult<AccountsListOutput, TRPCError> =>
  trpc.finance.accounts.list.useQuery({ includeInactive: false });

export const useFinancialInstitutions = (): UseTRPCQueryResult<InstitutionsListOutput, TRPCError> =>
  trpc.finance.institutions.list.useQuery();

type Account = RouterOutput['finance']['accounts']['list'][number];
type TransformedAccount = Omit<Account, 'createdAt' | 'updatedAt' | 'lastUpdated'> & {
  createdAt: Date;
  updatedAt: Date;
  lastUpdated: Date | null;
};

export function useFinanceAccountsWithMap(): UseTRPCQueryResult<
  RouterOutput['finance']['accounts']['list'],
  TRPCError
> & {
  accounts: TransformedAccount[];
  accountsMap: Map<string, TransformedAccount>;
} {
  const accountsQuery = useFinanceAccounts();

  // Transform accounts to convert string dates to Date objects
  const transformedAccounts = useMemo<TransformedAccount[]>(() => {
    return (accountsQuery.data || []).map((account) => ({
      ...account,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
      lastUpdated: account.lastUpdated ? new Date(account.lastUpdated) : null,
    }));
  }, [accountsQuery.data]);

  const accountsMap = useMemo(() => {
    return new Map<string, TransformedAccount>(
      transformedAccounts.map((account) => [account.id, account]),
    );
  }, [transformedAccounts]);

  return {
    ...(accountsQuery as any),
    accounts: transformedAccounts,
    accountsMap,
  };
}

// Hook that adds value by transforming data for unified view
export function useAllAccounts(): {
  isLoading: boolean;
  error: TRPCError | null;
  refetch: UseTRPCQueryResult<AccountsAllOutput, TRPCError>['refetch'];
  accounts: AccountsAllOutput['accounts'];
  connections: AccountsAllOutput['connections'];
} {
  const allAccountsQuery = trpc.finance.accounts.all.useQuery();

  return {
    isLoading: allAccountsQuery.isLoading,
    error: allAccountsQuery.error,
    refetch: allAccountsQuery.refetch,
    accounts: allAccountsQuery.data?.accounts || [],
    connections: allAccountsQuery.data?.connections || [],
  };
}

export function useAccountById(id: string): UseTRPCQueryResult<AccountsGetOutput, TRPCError> & {
  account: AccountsGetOutput | undefined;
} {
  const accountQuery = trpc.finance.accounts.get.useQuery({ id }, { enabled: !!id });

  return {
    ...(accountQuery as any),
    account: accountQuery.data ?? undefined,
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
}: UseFinanceTransactionsOptions = {}): {
  transactions: TransactionsListOutput['data'];
  totalTransactions: number;
  isLoading: boolean;
  error: TRPCError | null;
  refetch: UseTRPCQueryResult<TransactionsListOutput, TRPCError>['refetch'];
} {
  // Convert sort options to tRPC format
  const sortBy = useMemo(() => {
    return sortOptions[0]?.field || 'date';
  }, [sortOptions]);

  const sortOrder = useMemo(() => {
    return sortOptions[0]?.direction || 'desc';
  }, [sortOptions]);

  const offset = page * limit;

  const query = trpc.finance.transactions.list.useQuery(
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

  return {
    transactions: query.data?.data || [],
    totalTransactions: query.data?.filteredCount || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
