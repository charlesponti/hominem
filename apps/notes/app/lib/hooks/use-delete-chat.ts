import { useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc'

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
  chatStats: (userId: string) => ['chatStats', userId] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
}

/**
 * Hook for deleting a chat
 */
export function useDeleteChat(userId: string) {
  const queryClient = useQueryClient()
  const deleteChatMutation = trpc.chats.deleteChat.useMutation({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatStats(userId) })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.chat(variables.chatId) })
    },
  })

  return {
    deleteChat: deleteChatMutation.mutateAsync,
    isDeleting: deleteChatMutation.isPending,
  }
}
