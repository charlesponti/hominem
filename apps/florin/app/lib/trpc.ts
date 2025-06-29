import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../../packages/types/trpc';
import { createClient } from './supabase/client';

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export type SpendingTimeSeries = RouterOutput['finance']['analyze']['spendingTimeSeries']['data'][number];

export const trpc = createTRPCReact<AppRouter>()

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
  },
})

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
