import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import { createTRPCProxyClient } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { createClient } from './supabase/client'
import type { AppRouter } from '../../../../packages/types/trpc'

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

export const trpc = createTRPCReact<AppRouter>()
export const createTRPCClient = () => {
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        // Point to centralized API server instead of local route
        url: `${import.meta.env.VITE_PUBLIC_API_URL}/trpc`,
        async headers() {
          const supabase = createClient()
          if (!supabase) {
            throw new Error('Supabase client not found')
          }
          const {
            data: { session },
          } = await supabase.auth.getSession()
          return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}
        },
      }),
    ],
  })
}

// Back-compat: keep a default client instance for existing imports
export const trpcClient = createTRPCClient()
