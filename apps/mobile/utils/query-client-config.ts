import type { DefaultOptions } from '@tanstack/react-query';

export const QUERY_PERSISTENCE_STRATEGY = 'disabled';

export function shouldRetryQuery(failureCount: number, error: Error | Response): boolean {
  if (failureCount > 3) {
    return false;
  }

  if ('status' in error && typeof error.status === 'number') {
    return false;
  }
  return true;
}

export function getQueryRetryDelayMs(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

export const mobileQueryDefaultOptions: DefaultOptions = {
  queries: {
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: shouldRetryQuery,
    retryDelay: getQueryRetryDelayMs,
    networkMode: 'offlineFirst',
  },
  mutations: {
    retry: 1,
    networkMode: 'offlineFirst',
  },
};
