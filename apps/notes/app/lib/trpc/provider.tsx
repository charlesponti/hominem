import { getSupabase } from '@hominem/ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import type React from 'react'
import { useState } from 'react'
import { trpc } from './client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const supabase = getSupabase()

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env.VITE_PUBLIC_API_URL}/trpc`,
          async headers() {
            const {
              data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
              return {}
            }

            // Get session for access token after verifying user
            const {
              data: { session },
            } = await supabase.auth.getSession()

            if (!session?.access_token) {
              return {}
            }

            return { authorization: `Bearer ${session.access_token}` }
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
