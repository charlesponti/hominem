import { useHonoQuery } from '@hominem/hono-client/react';
import type { TwitterAccountsListOutput } from '@hominem/hono-rpc/types/twitter.types';
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
  } = useHonoQuery<TwitterAccountsListOutput>(
    ['twitter', 'accounts'],
    ({ twitter }) => twitter.getAccounts(),
  );

  const accountsArray = Array.isArray(accounts) ? accounts : [];

  return {
    data: accountsArray,
    isLoading,
    refetch,
  };
}
