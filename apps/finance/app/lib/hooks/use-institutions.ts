import type {
  InstitutionCreateInput,
  InstitutionCreateOutput,
  AccountsWithPlaidOutput,
  AccountConnectionsOutput,
  AccountInstitutionAccountsOutput,
  InstitutionsListOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '~/lib/api';

/**
 * Hook for creating a new institution with automatic cache invalidation
 */
export function useCreateInstitution() {
  const utils = useHonoUtils();
  const mutation = useHonoMutation<InstitutionCreateOutput, InstitutionCreateInput>(
    async (client, variables) => {
      const res = await client.api.finance.institutions.create.$post({
        json: variables,
      });
      return res.json() as unknown as InstitutionCreateOutput;
    },
    {
      onSuccess: () => {
        // Invalidate related queries
        utils.invalidate(['finance', 'institutions', 'list']);
        utils.invalidate(['finance', 'accounts', 'connections']);
      },
    },
  );

  return {
    createInstitution: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

// Hook for getting accounts grouped by institution
export function useAccountsByInstitution() {
  const query = useHonoQuery<AccountsWithPlaidOutput>(
    ['finance', 'accounts', 'with-plaid'],
    async (client) => {
      const res = await client.api.finance.accounts['with-plaid'].$post({ json: {} });
      return res.json() as unknown as Promise<AccountsWithPlaidOutput>;
    },
  );

  const accounts = Array.isArray(query.data) ? query.data : [];

  const accountsByInstitution = accounts.reduce<
    Record<
      string,
      {
        institutionId: string;
        institutionName: string;
        institutionLogo: string | null;
        accounts: typeof accounts;
      }
    >
  >((acc, account) => {
    const institutionId = account.institutionId || 'unlinked';
    const institutionName = account.institutionName || 'Unlinked Accounts';

    if (!acc[institutionId]) {
      acc[institutionId] = {
        institutionId,
        institutionName,
        institutionLogo: account.institutionLogo ?? null,
        accounts: [],
      };
    }

    acc[institutionId].accounts.push(account);
    return acc;
  }, {});

  return {
    accountsByInstitution,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// Export hooks for simple queries
export const useInstitutionConnections = () =>
  useHonoQuery<AccountConnectionsOutput>(['finance', 'accounts', 'connections'], async (client) => {
    const res = await client.api.finance.accounts.connections.$post({ json: {} });
    return res.json() as unknown as Promise<AccountConnectionsOutput>;
  });

export const useInstitutionAccounts = () =>
  useHonoQuery<AccountsWithPlaidOutput>(['finance', 'accounts', 'with-plaid'], async (client) => {
    const res = await client.api.finance.accounts['with-plaid'].$post({ json: {} });
    return res.json() as unknown as Promise<AccountsWithPlaidOutput>;
  });

export const useInstitutionAccountsByInstitution = (institutionId: string) =>
  useHonoQuery<AccountInstitutionAccountsOutput>(
    ['finance', 'accounts', 'institution-accounts', institutionId],
    async (client) => {
      const res = await client.api.finance.accounts['institution-accounts'].$post({
        json: { institutionId },
      });
      return res.json() as unknown as Promise<AccountInstitutionAccountsOutput>;
    },
    { enabled: !!institutionId },
  );

export const useAllInstitutions = () =>
  useHonoQuery<InstitutionsListOutput>(['finance', 'institutions', 'list'], async (client) => {
    const res = await client.api.finance.institutions.list.$post({ json: {} });
    return res.json() as unknown as Promise<InstitutionsListOutput>;
  });
