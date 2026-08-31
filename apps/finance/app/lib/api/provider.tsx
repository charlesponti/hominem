import { createFinanceApiClient, type FinanceClient } from '@hominem/rpc/finance';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';

const FinanceClientContext = createContext<FinanceClient | null>(null);

export function useFinanceApiClient(): FinanceClient {
  const client = useContext(FinanceClientContext);
  if (!client) {
    throw new Error('useFinanceApiClient must be used within FinanceHonoProvider');
  }
  return client;
}

interface FinanceHonoProviderProps {
  children: ReactNode;
  baseUrl: string;
}

export function FinanceHonoProvider({ children, baseUrl }: FinanceHonoProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60, refetchOnWindowFocus: false },
        },
      }),
  );

  // RPC calls are same-origin and authenticate via the Better Auth session
  // cookie (the client already sends credentials: 'include') - no
  // Authorization header is needed or valid here.
  const [client] = useState(() =>
    createFinanceApiClient({ baseUrl, onError: (e) => console.error('Hono RPC Error:', e) }),
  );

  return (
    <FinanceClientContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </FinanceClientContext.Provider>
  );
}
