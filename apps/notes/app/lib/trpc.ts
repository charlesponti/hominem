import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../packages/types/trpc'
import { createClient } from './supabase/client'

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

export const trpc = createTRPCReact<AppRouter>()

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_PUBLIC_API_URL}/trpc`,
        async headers() {
          const supabase = createClient()
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
