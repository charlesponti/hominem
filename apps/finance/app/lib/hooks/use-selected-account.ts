import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Query key for the selected account state
const SELECTED_ACCOUNT_KEY = ['selectedAccount'];

export function useSelectedAccount() {
  const queryClient = useQueryClient();

  // This makes the component reactive - it will re-render when the data changes
  const { data: selectedAccount = 'all' } = useQuery({
    queryKey: SELECTED_ACCOUNT_KEY,
    queryFn: () => queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all',
    enabled: false, // Don't actually fetch from server
    staleTime: Number.POSITIVE_INFINITY, // Never consider stale
    gcTime: Number.POSITIVE_INFINITY, // Never garbage collect
  });

  // Set the selected account in React Query cache
  const setSelectedAccount = useCallback(
    (accountId: string) => {
      queryClient.setQueryData(SELECTED_ACCOUNT_KEY, accountId);
    },
    [queryClient],
  );

  return {
    selectedAccount,
    setSelectedAccount,
  };
}

// Alternative hook that provides more control
export function useSelectedAccountWithDefaults(defaultAccount = 'all') {
  const queryClient = useQueryClient();

  const selectedAccount = queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) ?? defaultAccount;

  const setSelectedAccount = useCallback(
    (accountId: string) => {
      queryClient.setQueryData(SELECTED_ACCOUNT_KEY, accountId);
    },
    [queryClient],
  );

  const resetSelectedAccount = useCallback(() => {
    queryClient.setQueryData(SELECTED_ACCOUNT_KEY, defaultAccount);
  }, [queryClient, defaultAccount]);

  return {
    selectedAccount,
    setSelectedAccount,
    resetSelectedAccount,
  };
}
