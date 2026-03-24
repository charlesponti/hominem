import { useRpcQuery } from '@hominem/rpc/react';
import { useCallback } from 'react';

export function useTwitterOAuth() {
  // keeping this stub as it was in original, potentially unused or pending implementation
  const refetch = useCallback(async () => {}, []);

  return {
    refetch,
  };
}

export function useTwitterAccounts() {
  const {
    data: accounts,
    isLoading,
    refetch,
  } = useRpcQuery(({ twitter }) => twitter.getAccounts(), {
    queryKey: ['twitter', 'accounts'],
  });

  const accountsArray = Array.isArray(accounts) ? accounts : [];

  return {
    data: accountsArray,
    isLoading,
    refetch,
  };
}
