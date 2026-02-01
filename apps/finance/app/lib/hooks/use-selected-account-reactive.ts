import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

// Query key for the selected account state
const SELECTED_ACCOUNT_KEY = ['selectedAccount'];

/**
 * Reactive version that will trigger re-renders when state changes
 * Uses useQuery with enabled: false to subscribe to changes without fetching
 */
export function useSelectedAccountReactive() {
  const queryClient = useQueryClient();

  // This makes the component reactive - it will re-render when the data changes
  const { data: selectedAccount = 'all' } = useQuery({
    queryKey: SELECTED_ACCOUNT_KEY,
    queryFn: () => queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all',
    enabled: false, // Don't actually fetch from server
    staleTime: Number.POSITIVE_INFINITY, // Never consider stale
    gcTime: Number.POSITIVE_INFINITY, // Never garbage collect
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

/**
 * Alternative using subscription pattern - more control over re-renders
 */
export function useSelectedAccountWithSubscription() {
  const queryClient = useQueryClient();
  const [selectedAccount, setSelectedAccountState] = useState(
    () => queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all',
  );

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Only update if our specific query changed
      if (
        event?.query?.queryKey &&
        JSON.stringify(event.query.queryKey) === JSON.stringify(SELECTED_ACCOUNT_KEY)
      ) {
        const newValue = queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all';
        setSelectedAccountState(newValue);
      }
    });

    return unsubscribe;
  }, [queryClient]);

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

/**
 * Generic hook for any reactive query state
 */
export function useQueryState<T>(queryKey: unknown[], defaultValue: T) {
  const queryClient = useQueryClient();

  const { data: state = defaultValue } = useQuery({
    queryKey,
    queryFn: () => queryClient.getQueryData<T>(queryKey) ?? defaultValue,
    enabled: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const setState = useCallback(
    (value: T) => {
      queryClient.setQueryData(queryKey, value);
    },
    [queryClient, queryKey],
  );

  return [state, setState] as const;
}
