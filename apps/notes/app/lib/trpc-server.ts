import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../../packages/types/trpc'

export function createServerTRPCClient(accessToken?: string) {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_PUBLIC_API_URL}/trpc`,
        async headers() {
          return accessToken ? { authorization: `Bearer ${accessToken}` } : {}
        },
      }),
    ],
  })
}
