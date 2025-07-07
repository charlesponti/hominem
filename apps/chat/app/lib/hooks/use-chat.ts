import { trpc } from '../trpc-client'

/**
 * Hook for getting a specific chat with messages
 */
export function getChatById(chatId: string | null) {
  return trpc.chats.getChatById.useQuery(
    { chatId: chatId || '' },
    {
      enabled: !!chatId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  )
}
