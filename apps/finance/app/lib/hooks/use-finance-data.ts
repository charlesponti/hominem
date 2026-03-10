import type {
  AccountAllOutput,
  AccountGetOutput,
  AccountListOutput,
  AccountWithTransactions,
  TransactionListOutput,
} from '@hominem/hono-rpc/types/finance.types';
import type { SortOption } from '@hominem/ui/hooks';
import { format } from 'date-fns';
import { useMemo } from 'react';

import { useHonoQuery } from '~/lib/api';

type RawAccountWithTransactions = {
  id: string;
  userId: string;
  name: string;
  accountType: AccountWithTransactions['accountType'];
  balance: number;
  transactions: AccountWithTransactions['transactions'];
  institutionName?: string | null | undefined;
  plaidAccountId?: string | null | undefined;
  plaidItemId?: string | null | undefined;
};

function normalizeAccountWithTransactions(
  account: RawAccountWithTransactions,
): AccountWithTransactions {
  const normalized: AccountWithTransactions = {
    id: account.id,
    userId: account.userId,
    name: account.name,
    accountType: account.accountType,
    balance: account.balance,
    transactions: account.transactions,
  }

  if (account.institutionName !== undefined) {
    normalized.institutionName = account.institutionName
  }
  if (account.plaidAccountId !== undefined) {
    normalized.plaidAccountId = account.plaidAccountId
  }
  if (account.plaidItemId !== undefined) {
    normalized.plaidItemId = account.plaidItemId
  }

  return normalized
}

export interface FilterArgs {
  accountId?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  description?: string | undefined;
}

interface UseFinanceAccountsOptions {
  initialData?: AccountListOutput;
}

export const useFinanceAccounts = ({ initialData }: UseFinanceAccountsOptions = {}) => {
  const { data, isLoading, error, refetch } = useHonoQuery<AccountListOutput>(
    ['finance', 'accounts', 'list'],
    ({ finance }) => finance.listAccounts({ includeInactive: false }),
    initialData ? { initialData } : {},
  );

  const accountsData = (Array.isArray(data) ? data : []) as AccountListOutput;

  const accountsMap = useMemo(() => {
    if (!Array.isArray(accountsData)) {
      return new Map<string, AccountListOutput[number]>();
    }
    return new Map(accountsData.map((account) => [account.id, account]));
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
  useHonoQuery(['finance', 'institutions', 'list'], ({ finance }) => finance.listInstitutions());

// Hook that adds value by transforming data for unified view
export function useAllAccounts(options?: { initialData?: AccountAllOutput }) {
  const allAccountsQuery = useHonoQuery<AccountAllOutput>(
    ['finance', 'accounts', 'all'],
    async ({ finance }) => {
      const data = await finance.listAllAccounts()
      return {
        ...data,
        accounts: data.accounts.map((account) => normalizeAccountWithTransactions(account)),
      };
    },
    options?.initialData ? { initialData: options.initialData } : {},
  );

  const result = allAccountsQuery.data;

  return {
    isLoading: allAccountsQuery.isLoading,
    error: allAccountsQuery.error,
    refetch: allAccountsQuery.refetch,
    accounts: (result?.accounts ?? []).map(normalizeAccountWithTransactions),
    connections: result?.connections ?? [],
  };
}

export function useAccountById(id: string, options?: { initialData?: AccountGetOutput }) {
  const accountQuery = useHonoQuery<AccountGetOutput>(
    ['finance', 'accounts', 'get', id],
    async ({ finance }) => {
      const data = await finance.getAccount({ id });
      return normalizeAccountWithTransactions(data);
    },
    {
      enabled: !!id,
      ...(options?.initialData ? { initialData: options.initialData } : {}),
    },
  );

  const account = accountQuery.data;

  return {
    ...accountQuery,
    account: account ? normalizeAccountWithTransactions(account) : undefined,
  };
}

interface UseFinanceTransactionsOptions {
  filters?: FilterArgs;
  sortOptions?: SortOption[];
  page?: number;
  limit?: number;
  initialData?: TransactionListOutput;
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

  const queryOptions: { staleTime: number; initialData?: TransactionListOutput } = {
    staleTime: 1 * 60 * 1000,
  };

  if (initialData) {
    queryOptions.initialData = initialData;
  }

  const query = useHonoQuery<TransactionListOutput>(
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
    ({ finance }) =>
      finance.listTransactions({
        ...(filters.dateFrom ? { dateFrom: format(filters.dateFrom, 'yyyy-MM-dd') } : {}),
        ...(filters.dateTo ? { dateTo: format(filters.dateTo, 'yyyy-MM-dd') } : {}),
        ...(filters.accountId && filters.accountId !== 'all' ? { account: filters.accountId } : {}),
        ...(filters.description ? { description: filters.description } : {}),
        limit,
        offset,
        sortBy,
        sortDirection: sortOrder as 'asc' | 'desc',
      }),
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
