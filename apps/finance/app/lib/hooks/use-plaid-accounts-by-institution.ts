import { useSupabaseAuthContext } from '@hominem/auth';
import { useApiClient } from '@hominem/ui';
import { useQuery } from '@tanstack/react-query';

// Define query keys
const PLAID_ACCOUNTS_BY_INSTITUTION_KEY = (institutionId: string) => [
  ['plaid', 'accounts', 'institution', institutionId],
];

interface PlaidAccountByInstitution {
  id: string;
  name: string;
  type: string;
  balance: string;
  mask: string | null;
  subtype: string | null;
  institutionId: string;
  plaidItemId: string;
  institutionName: string;
  institutionLogo: string | null;
}

/**
 * Hook for fetching Plaid accounts for a specific institution
 */
export function usePlaidAccountsByInstitution(institutionId: string | null, options = {}) {
  const { userId } = useSupabaseAuthContext();
  const apiClient = useApiClient();

  const defaultOptions = {
    enabled: !!userId && !!institutionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  };

  const query = useQuery<{ accounts: PlaidAccountByInstitution[] }>({
    queryKey: institutionId ? PLAID_ACCOUNTS_BY_INSTITUTION_KEY(institutionId) : [],
    queryFn: async () => {
      if (!institutionId) {
        throw new Error('Institution ID is required');
      }

      // Use the unified endpoint and filter for Plaid accounts by institution
      const response = await apiClient.get<
        null,
        {
          accounts: Array<{
            id: string;
            name: string;
            type: string;
            balance: string;
            mask: string | null;
            subtype: string | null;
            institutionId?: string;
            plaidItemId?: string;
            institutionName?: string;
            institutionLogo?: string | null;
            isPlaidConnected?: boolean;
          }>;
        }
      >('/api/finance/accounts/all');

      const plaidAccounts = response.accounts
        .filter((account) => account.isPlaidConnected && account.institutionId === institutionId)
        .map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance,
          mask: account.mask,
          subtype: account.subtype,
          institutionId: account.institutionId || '',
          plaidItemId: account.plaidItemId || '',
          institutionName: account.institutionName || '',
          institutionLogo: account.institutionLogo || null,
        }));

      return { accounts: plaidAccounts };
    },
    ...defaultOptions,
    ...options,
  });

  return {
    accounts: query.data?.accounts || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
