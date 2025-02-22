import type { AppRouter } from '@/server'
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'
import { createTRPCReact } from '@trpc/react-query'
import superjson from 'superjson'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  })
}

export const trpc = createTRPCReact<AppRouter>()
