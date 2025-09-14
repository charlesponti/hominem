import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import type { AppRouter } from '../../../../packages/types/trpc'
import { createClient } from './supabase/client'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
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
