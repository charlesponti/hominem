import type React from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Hono RPC Provider
 * Provides query client for API interactions
 * Individual route handlers will use the honoClient directly
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Auth context available via useSupabaseAuthContext
  // API client available via honoClient from @/lib/trpc/client
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
