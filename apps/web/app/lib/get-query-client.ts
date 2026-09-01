import { isServer, QueryClient } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    // always a fresh client on the server, one per request
    return makeQueryClient();
  }

  // reuse the same client in the browser so we don't lose cache/state if
  // React suspends mid-render during the initial load
  if (!browserQueryClient) browserQueryClient = makeQueryClient();

  return browserQueryClient;
}
