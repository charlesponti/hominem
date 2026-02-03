import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createHonoClient, type ClientConfig } from '../core/client';
import { HonoClientContext } from './context';

export interface HonoProviderProps {
  children: ReactNode;
  config: ClientConfig;
  queryClient?: QueryClient;
}

export function HonoProvider({
  children,
  config,
  queryClient: providedQueryClient,
}: HonoProviderProps) {
  const [queryClient] = useState(
    () =>
      providedQueryClient ||
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [honoClient] = useState(() => createHonoClient(config));

  return (
    <HonoClientContext.Provider value={honoClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </HonoClientContext.Provider>
  );
}
