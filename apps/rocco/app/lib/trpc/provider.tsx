import { useSupabaseAuthContext } from '@hominem/ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useMemo, useState } from 'react'
import { trpc } from './client'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const { supabase } = useSupabaseAuthContext()

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: '/api/trpc',
            async headers() {
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
      }),
    [supabase]
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
