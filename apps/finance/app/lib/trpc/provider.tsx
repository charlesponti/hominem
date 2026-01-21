import type React from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';

import { trpc } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const { supabase } = useSupabaseAuthContext();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env.VITE_PUBLIC_API_URL}/trpc`,
          async headers() {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
              return {};
            }

            return { authorization: `Bearer ${session.access_token}` };
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
