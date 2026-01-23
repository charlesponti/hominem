import type {
  InstitutionCreateOutput,
  AccountsWithPlaidOutput,
  AccountConnectionsOutput,
  AccountInstitutionAccountsOutput,
  InstitutionsListOutput,
} from '@hominem/hono-rpc/types/finance.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '~/lib/hono';

/**
 * Hook for creating a new institution with automatic cache invalidation
 */
export function useCreateInstitution() {
  const utils = useHonoUtils();
  const mutation = useHonoMutation<InstitutionCreateOutput, any>(
    async (client, variables) => {
      const res = await client.api.finance.institutions.create.$post({
        json: variables,
      });
      return res.json();
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
  const query = useHonoQuery(['finance', 'accounts', 'with-plaid'], async (client) => {
    const res = await client.api.finance.accounts['with-plaid'].$post({ json: {} });
    return res.json();
  });

  const accounts = Array.isArray(query.data) ? query.data : [];

  const accountsByInstitution = accounts.reduce(
    (
      acc: Record<
        string,
        {
          institutionId: string;
          institutionName: string;
          institutionLogo: string | null;
          accounts: typeof accounts;
        }
      >,
      account,
    ) => {
      const institutionId = account.institutionId || 'unlinked';
      const institutionName = account.institutionName || 'Unlinked Accounts';

      if (!acc[institutionId]) {
        acc[institutionId] = {
          institutionId,
          institutionName,
          institutionLogo: account.institutionLogo,
          accounts: [],
        };
      }

      acc[institutionId].accounts.push(account);
      return acc;
    },
    {},
  );

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
  useHonoQuery(['finance', 'accounts', 'connections'], async (client) => {
    const res = await client.api.finance.accounts.connections.$post({ json: {} });
    return res.json();
  });

export const useInstitutionAccounts = () =>
  useHonoQuery(['finance', 'accounts', 'with-plaid'], async (client) => {
    const res = await client.api.finance.accounts['with-plaid'].$post({ json: {} });
    return res.json();
  });

export const useInstitutionAccountsByInstitution = (institutionId: string) =>
  useHonoQuery(
    ['finance', 'accounts', 'institution-accounts', institutionId],
    async (client) => {
      const res = await client.api.finance.accounts['institution-accounts'].$post({
        json: { institutionId },
      });
      return res.json();
    },
    { enabled: !!institutionId },
  );

export const useAllInstitutions = () =>
  useHonoQuery(['finance', 'institutions', 'list'], async (client) => {
    const res = await client.api.finance.institutions.list.$post({ json: {} });
    return res.json();
  });
