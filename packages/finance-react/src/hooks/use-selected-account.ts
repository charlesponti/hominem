import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

const SELECTED_ACCOUNT_KEY = ['selectedAccount'];

export function useSelectedAccount() {
  const queryClient = useQueryClient();

  const { data: selectedAccount = 'all' } = useQuery({
    queryKey: SELECTED_ACCOUNT_KEY,
    queryFn: () => queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all',
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

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

function _useSelectedAccountWithDefaults(defaultAccount = 'all') {
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
