import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { createClient } from './supabase/client'
import type { AppRouter } from './trpc/router'

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

export const trpc = createTRPCReact<AppRouter>()

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
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
