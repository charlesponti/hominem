import type { Chat, ChatMessageSelect } from '@hominem/utils/schema'
import { useQueryClient } from '@tanstack/react-query'
import { trpc } from '../trpc-client'

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
  const { data, isLoading, error } = trpc.chatOperations.getUserChats.useQuery(
    { userId, limit: 50 },
    {
      enabled: userId !== 'anonymous',
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  )

  return {
    chats: data?.chats || [],
    isLoading,
    error,
  }
}

/**
 * Hook for creating a new chat
 */
export function useCreateChat(userId: string) {
  const queryClient = useQueryClient()
  const createChatMutation = trpc.chatOperations.createChat.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatStats(userId) })
    },
  })

  return {
    createChat: createChatMutation.mutateAsync,
    isCreating: createChatMutation.isPending,
  }
}

/**
 * Hook for deleting a chat
 */
export function useDeleteChat(userId: string) {
  const queryClient = useQueryClient()
  const deleteChatMutation = trpc.chatOperations.deleteChat.useMutation({
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

/**
 * Hook for updating chat title
 */
export function useUpdateChatTitle(userId: string) {
  const queryClient = useQueryClient()
  const updateTitleMutation = trpc.chatOperations.updateChatTitle.useMutation({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat(variables.chatId) })
    },
  })

  return {
    updateTitle: updateTitleMutation.mutateAsync,
    isUpdatingTitle: updateTitleMutation.isPending,
  }
}

/**
 * Hook for getting a specific chat with messages
 */
export function useChat(chatId: string | null) {
  const { data, isLoading, error, refetch } = trpc.chatOperations.getChatById.useQuery(
    { chatId: chatId || '' },
    {
      enabled: !!chatId,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  )

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
  const { data, isLoading, error } = trpc.chatOperations.getChatStats.useQuery(
    { userId },
    {
      enabled: userId !== 'anonymous',
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  )

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
  const { data, isLoading, error } = trpc.chatOperations.searchChats.useQuery(
    { userId, query, limit: 20 },
    {
      enabled: enabled && userId !== 'anonymous' && query.trim().length > 0,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  )

  return {
    chats: data?.chats || [],
    isLoading,
    error,
  }
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
