import type { Chat, ChatMessageSelect } from '@hominem/utils/schema'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface ChatWithMessages extends Chat {
  messages: ChatMessageSelect[]
}

export interface CreateChatParams {
  title: string
  userId: string
}

export interface ChatStatsResponse {
  totalChats: number
  totalMessages: number
  recentActivity: Date | null
}

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
  chatStats: (userId: string) => ['chatStats', userId] as const,
  searchChats: (userId: string, query: string) => ['searchChats', userId, query] as const,
}

/**
 * Hook for managing user chats
 */
export function useChats(userId: string) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.chats(userId),
    queryFn: async () => {
      if (!userId || userId === 'anonymous') {
        return { chats: [] }
      }

      const response = await fetch(`/api/chats?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch chats')
      }
      return response.json()
    },
    enabled: userId !== 'anonymous',
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const createChatMutation = useMutation({
    mutationFn: async (params: CreateChatParams) => {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...params }),
      })

      if (!response.ok) {
        throw new Error('Failed to create chat')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatStats(userId) })
    },
  })

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', chatId }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }

      return response.json()
    },
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatStats(userId) })
      queryClient.removeQueries({ queryKey: QUERY_KEYS.chat(chatId) })
    },
  })

  const updateTitleMutation = useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateTitle', chatId, title }),
      })

      if (!response.ok) {
        throw new Error('Failed to update chat title')
      }

      return response.json()
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat(chatId) })
    },
  })

  return {
    chats: data?.chats || [],
    isLoading,
    error,
    createChat: createChatMutation.mutate,
    deleteChat: deleteChatMutation.mutate,
    updateTitle: updateTitleMutation.mutate,
    isCreating: createChatMutation.isPending,
    isDeleting: deleteChatMutation.isPending,
    isUpdatingTitle: updateTitleMutation.isPending,
  }
}

/**
 * Hook for getting a specific chat with messages
 */
export function useChat(chatId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.chat(chatId || ''),
    queryFn: async () => {
      if (!chatId) return null

      const response = await fetch(`/api/chats/${chatId}`)
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Failed to fetch chat')
      }
      return response.json()
    },
    enabled: !!chatId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })

  return {
    chat: data?.chat as ChatWithMessages | null,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for getting user chat statistics
 */
export function useChatStats(userId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.chatStats(userId),
    queryFn: async () => {
      if (!userId || userId === 'anonymous') {
        return { stats: { totalChats: 0, totalMessages: 0, recentActivity: null } }
      }

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getStats', userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch chat stats')
      }

      return response.json()
    },
    enabled: userId !== 'anonymous',
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })

  return {
    stats: data?.stats as ChatStatsResponse | null,
    isLoading,
    error,
  }
}

/**
 * Hook for searching chats
 */
export function useSearchChats(userId: string, query: string, enabled = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.searchChats(userId, query),
    queryFn: async () => {
      if (!userId || userId === 'anonymous' || !query.trim()) {
        return { chats: [] }
      }

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', userId, query: query.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to search chats')
      }

      return response.json()
    },
    enabled: enabled && userId !== 'anonymous' && query.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  return {
    chats: data?.chats || [],
    isLoading,
    error,
  }
}

/**
 * Hook for optimistic chat updates
 */
export function useChatMutations(userId: string) {
  const queryClient = useQueryClient()

  const optimisticCreateChat = (params: CreateChatParams & { id: string }) => {
    const queryKey = QUERY_KEYS.chats(userId)

    // Optimistically add the new chat
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old)
        return {
          chats: [
            { ...params, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
        }
      return {
        ...old,
        chats: [
          { ...params, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ...old.chats,
        ],
      }
    })
  }

  const optimisticDeleteChat = (chatId: string) => {
    const queryKey = QUERY_KEYS.chats(userId)

    // Optimistically remove the chat
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return { chats: [] }
      return {
        ...old,
        chats: old.chats.filter((chat: Chat) => chat.id !== chatId),
      }
    })
  }

  const optimisticUpdateTitle = (chatId: string, title: string) => {
    const chatKey = QUERY_KEYS.chat(chatId)
    const chatsKey = QUERY_KEYS.chats(userId)

    // Update individual chat
    queryClient.setQueryData(chatKey, (old: any) => {
      if (!old) return old
      return {
        ...old,
        chat: { ...old.chat, title, updatedAt: new Date().toISOString() },
      }
    })

    // Update chat in the list
    queryClient.setQueryData(chatsKey, (old: any) => {
      if (!old) return old
      return {
        ...old,
        chats: old.chats.map((chat: Chat) =>
          chat.id === chatId ? { ...chat, title, updatedAt: new Date().toISOString() } : chat
        ),
      }
    })
  }

  return {
    optimisticCreateChat,
    optimisticDeleteChat,
    optimisticUpdateTitle,
  }
}
