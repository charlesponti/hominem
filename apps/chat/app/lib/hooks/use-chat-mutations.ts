import type { CreateChatParams } from '@hominem/chat-service'
import { useQueryClient } from '@tanstack/react-query'

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
}

/**
 * Hook for chat mutations with optimistic updates
 */
export function useChatMutations(userId: string) {
  const queryClient = useQueryClient()

  const optimisticCreateChat = (params: CreateChatParams & { id: string }) => {
    queryClient.setQueryData(QUERY_KEYS.chats(userId), (old: any) => ({
      chats: [params, ...(old?.chats || [])],
    }))
  }

  const optimisticDeleteChat = (chatId: string) => {
    queryClient.setQueryData(QUERY_KEYS.chats(userId), (old: any) => ({
      chats: (old?.chats || []).filter((chat: any) => chat.id !== chatId),
    }))
  }

  const optimisticUpdateTitle = (chatId: string, title: string) => {
    queryClient.setQueryData(QUERY_KEYS.chats(userId), (old: any) => ({
      chats: (old?.chats || []).map((chat: any) =>
        chat.id === chatId ? { ...chat, title } : chat
      ),
    }))
  }

  return {
    optimisticCreateChat,
    optimisticDeleteChat,
    optimisticUpdateTitle,
  }
}
