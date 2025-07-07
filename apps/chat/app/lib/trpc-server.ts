import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../../packages/types/trpc'
import { API_URL } from './env.server'

/**
 * Creates a server-side tRPC client for use in loaders and other server-side code
 * This client makes direct HTTP requests to the API server
 */
export const createServerTRPCClient = (accessToken?: string) => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        async headers() {
          return accessToken ? { authorization: `Bearer ${accessToken}` } : {}
        },
      }),
    ],
  })
}
