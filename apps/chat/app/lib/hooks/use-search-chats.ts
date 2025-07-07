import { trpc } from '../trpc-client'

/**
 * Hook for searching chats
 */
export function useSearchChats(userId: string, query: string, enabled = true) {
  return trpc.chats.searchChats.useQuery(
    { userId, query, limit: 20 },
    {
      enabled: enabled && userId !== 'anonymous' && query.trim().length > 0,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  )
}
