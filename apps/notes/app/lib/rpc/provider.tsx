import type React from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Hono RPC Provider
 * Provides query client for API interactions
 * Individual route handlers should use the Hono RPC client directly
 */
export function RPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // Auth context available via useSupabaseAuthContext
  // API client available via `honoClient` from ./client

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
