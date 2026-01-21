import { useQueryClient } from '@tanstack/react-query';

import { trpc } from '~/lib/trpc';

/**
 * Hook for creating a new institution with automatic cache invalidation
 */
export function useCreateInstitution() {
  const queryClient = useQueryClient();
  const mutation = trpc.finance.institutions.create.useMutation({
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'connections'] });
    },
  });

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
  const {
    data: accounts = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.finance.institutions.accounts.useQuery();

  const accountsByInstitution = accounts.reduce(
    (
      acc: Record<
        string,
        {
          institutionId: string;
          institutionName: string;
          institutionLogo: string | null;
          accounts: (typeof accounts)[number][];
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
    isLoading,
    isError,
    error,
    refetch,
  };
}

// Export tRPC hooks directly for simple queries
export const useInstitutionConnections = () => trpc.finance.institutions.connections.useQuery();
export const useInstitutionAccounts = () => trpc.finance.institutions.accounts.useQuery();

export const useInstitutionAccountsByInstitution = (institutionId: string) =>
  trpc.finance.institutions.institutionAccounts.useQuery(
    { institutionId },
    { enabled: !!institutionId },
  );
export const useInstitution = (institutionId: string) =>
  trpc.finance.institutions.get.useQuery({ institutionId }, { enabled: !!institutionId });
export const useAllInstitutions = () => trpc.finance.institutions.list.useQuery();

// Link an account to an institution
export function useLinkAccountToInstitution() {
  const queryClient = useQueryClient();
  const mutation = trpc.finance.institutions.link.useMutation({
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts', 'list'] });
    },
  });

  return {
    linkAccount: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}

// Unlink an account from an institution
export function useUnlinkAccountFromInstitution() {
  const queryClient = useQueryClient();
  const mutation = trpc.finance.institutions.unlink.useMutation({
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'connections'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts', 'list'] });
    },
  });

  return {
    unlinkAccount: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  };
}
