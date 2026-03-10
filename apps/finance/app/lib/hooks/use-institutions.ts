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
function useCreateInstitution() {
  const utils = useHonoUtils();
  const mutation = useHonoMutation<InstitutionCreateOutput, InstitutionCreateInput>(
    ({ finance }, variables) => finance.createInstitution(variables),
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
function useAccountsByInstitution() {
  const query = useHonoQuery<AccountsWithPlaidOutput>(
    ['finance', 'accounts', 'with-plaid'],
    ({ finance }) => finance.listAccountsWithPlaid(),
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
    const institutionId = account.institutionName || 'unlinked';
    const institutionName = account.institutionName || 'Unlinked Accounts';

    if (!acc[institutionId]) {
      acc[institutionId] = {
        institutionId,
        institutionName,
        institutionLogo: null,
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
const useInstitutionConnections = () =>
  useHonoQuery<AccountConnectionsOutput>(
    ['finance', 'accounts', 'connections'],
    ({ finance }) => finance.listConnections(),
  );

const useInstitutionAccounts = () =>
  useHonoQuery<AccountsWithPlaidOutput>(
    ['finance', 'accounts', 'with-plaid'],
    ({ finance }) => finance.listAccountsWithPlaid(),
  );

const useInstitutionAccountsByInstitution = (institutionId: string) =>
  useHonoQuery<AccountInstitutionAccountsOutput>(
    ['finance', 'accounts', 'institution-accounts', institutionId],
    ({ finance }) => finance.listInstitutionAccounts({ institutionId }),
    { enabled: !!institutionId },
  );

export const useAllInstitutions = () =>
  useHonoQuery<InstitutionsListOutput>(
    ['finance', 'institutions', 'list'],
    ({ finance }) => finance.listInstitutions(),
  );
