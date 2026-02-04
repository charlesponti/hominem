import type React from 'react';

import { HonoProvider } from '~/lib/hono';

/**
 * RPCProvider
 * - Ensures the Hono RPC client and query client are available to the app
 * - Wraps children with the `HonoProvider` which provides the Hono client and QueryClient
 */
export function RPCProvider({ children }: { children: React.ReactNode }) {
  return <HonoProvider>{children}</HonoProvider>;
}
