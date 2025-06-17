import { useAuth } from '@/lib/supabase/auth-hooks'
import { useSupabaseApiClient } from '@hominem/ui'
import type { ChatMessageSelect } from '@hominem/utils/types'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { streamToString } from './stream-utils'

export enum CHAT_ENDPOINTS {
  AGENT = '/api/agent',
  CHAT = '/api/chat',
  SINGLE_RESPONSE = '/api/chat/single-response',
  RETRIEVAL = '/api/chat/retrieval',
  RETRIEVAL_AGENT = '/api/chat/retrieval-agent',
}

interface ChatResponse {
  messages: ChatMessageSelect[]
}

interface SendMessageRequest {
  message: string
  showDebugInfo?: boolean
}

interface ChatInitResponse {
  success?: boolean
  chatId: string
  messages: ChatMessageSelect[]
}

interface ChatHistoryResponse {
  chatId: string
  messages: ChatMessageSelect[]
  hasMore: boolean
}

interface ChatHistoryPage extends ChatHistoryResponse {
  offset: number
}

type UseChatOptions = {
  endpoint: CHAT_ENDPOINTS
  initialMessages?: ChatMessageSelect[]
  showDebugInfo?: boolean
  stream?: boolean
}

/**
 * Hook for chat functionality with optimized state management and type safety
 */
export function useChat({
  endpoint,
  stream = false,
  initialMessages = [],
  showDebugInfo = false,
}: UseChatOptions) {
  const { user } = useAuth()
  const api = useSupabaseApiClient()
  const queryClient = useQueryClient()

  const userId = user?.id

  // Query keys - memoized to prevent unnecessary re-renders
  const chatQueryKey = useMemo(() => ['chat', endpoint], [endpoint])
  const historyQueryKey = useCallback(
    (chatId: string) => ['chat-history', endpoint, chatId],
    [endpoint]
  )

  // Initial load: fetch chatId and most recent messages
  const {
    data: initialData,
    isLoading: isLoadingInitial,
    error: initialError,
    refetch: refetchInitial,
  } = useQuery<ChatInitResponse>({
    queryKey: chatQueryKey,
    queryFn: async (): Promise<ChatInitResponse> => {
      const res = await api.get<ChatInitResponse>(endpoint)
      return res
    },
    enabled: !!userId,
  })

  const chatId = initialData?.chatId
  const latestMessages = initialData?.messages || []

  // Helper to update latest page of messages optimistically
  const updateLatestMessages = useCallback(
    (newMessages: ChatMessageSelect[]) => {
      queryClient.setQueryData(chatQueryKey, (old: ChatInitResponse | undefined) => ({
        ...old,
        chatId: chatId || '',
        messages: newMessages,
      }))
    },
    [queryClient, chatQueryKey, chatId]
  )

  // Helper to add a single message optimistically
  const addMessage = useCallback(
    (message: Partial<ChatMessageSelect> & { role: string; content: string }) => {
      const newMessage: ChatMessageSelect = {
        id: message.id || crypto.randomUUID(),
        chatId: message.chatId || chatId || '',
        userId: message.userId || userId || '',
        role: message.role,
        content: message.content,
        toolCalls: message.toolCalls || null,
        reasoning: message.reasoning || null,
        files: message.files || null,
        parentMessageId: message.parentMessageId || null,
        messageIndex: message.messageIndex || String(Date.now()),
        createdAt: message.createdAt || new Date().toISOString(),
        updatedAt: message.updatedAt || new Date().toISOString(),
      }

      queryClient.setQueryData(chatQueryKey, (old: ChatInitResponse | undefined) => ({
        ...old,
        chatId: chatId || '',
        messages: [...(old?.messages || []), newMessage],
      }))

      return newMessage
    },
    [queryClient, chatQueryKey, chatId, userId]
  )

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Input validation
      if (!content || typeof content !== 'string') {
        throw new Error('Message content is required and must be a string')
      }

      const trimmedContent = content.trim()
      if (!trimmedContent) {
        throw new Error('Message cannot be empty')
      }

      if (trimmedContent.length > 10000) {
        throw new Error('Message is too long (maximum 10,000 characters)')
      }

      if (!userId || !chatId) {
        throw new Error('User ID or Chat ID is missing')
      }

      // Add user message immediately for UI responsiveness
      const userMessage = addMessage({
        role: 'user',
        content: trimmedContent,
      })

      // Handle streaming endpoints
      if (stream) {
        const requestBody = {
          message: trimmedContent,
          type: 'stream' as const,
          showDebugInfo,
        }

        const response = await api.stream(endpoint, requestBody)

        // Initialize a placeholder message in the cache
        const streamId = 'stream-response'
        const streamMessage = addMessage({
          id: streamId,
          role: 'assistant',
          content: '',
        })

        // Read stream into cache
        await streamToString(response, (responseText) => {
          queryClient.setQueryData(chatQueryKey, (old: ChatInitResponse | undefined) => ({
            ...old,
            chatId: chatId || '',
            messages: (old?.messages || []).map((m) =>
              m.id === streamId ? { ...m, content: responseText } : m
            ),
          }))
        })

        // Finalize by replacing the temporary id
        queryClient.setQueryData(chatQueryKey, (old: ChatInitResponse | undefined) => ({
          ...old,
          chatId: chatId || '',
          messages: (old?.messages || []).map((m) =>
            m.id === streamId ? { ...m, id: crypto.randomUUID() } : m
          ),
        }))

        return { success: true }
      }

      // Handle non-streaming endpoints
      const requestBody: SendMessageRequest = {
        message: trimmedContent,
        showDebugInfo,
      }

      const response = await api.post<SendMessageRequest, ChatResponse>(endpoint, requestBody)
      return response
    },
    onSuccess: (responseData) => {
      if (!responseData) return

      if (
        'messages' in responseData &&
        Array.isArray(responseData.messages) &&
        responseData.messages.length > 0
      ) {
        const messagesFromServer = responseData.messages
        const firstMessageChatId = messagesFromServer[0].chatId

        const currentActiveChatState = queryClient.getQueryData<ChatInitResponse>(chatQueryKey)
        const activeDisplayChatId = currentActiveChatState?.chatId

        if (firstMessageChatId && firstMessageChatId === activeDisplayChatId) {
          queryClient.setQueryData<ChatInitResponse | undefined>(chatQueryKey, (oldData) => {
            const currentMessages = oldData?.messages || []
            return {
              ...(oldData || {}),
              chatId: activeDisplayChatId,
              messages: [...currentMessages, ...messagesFromServer],
            }
          })
          if (activeDisplayChatId) {
            queryClient.invalidateQueries({ queryKey: historyQueryKey(activeDisplayChatId) })
          }
        } else if (firstMessageChatId) {
          // Messages are for a different chat or active chat is not loaded.
          // Invalidate history of the chat these messages belong to.
          queryClient.invalidateQueries({ queryKey: historyQueryKey(firstMessageChatId) })
        }
      }
    },
    onError: (error, variables, context) => {
      console.error('Chat error:', error)

      // Remove the optimistic user message on error
      queryClient.setQueryData(chatQueryKey, (old: ChatInitResponse | undefined) => {
        if (!old?.messages) return old

        // Remove the last message if it was the failed user message
        const lastMessage = old.messages[old.messages.length - 1]
        if (lastMessage?.role === 'user' && lastMessage?.content === variables) {
          return {
            ...old,
            messages: old.messages.slice(0, -1),
          }
        }
        return old
      })
    },
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors, but not for validation errors
      if (failureCount >= 2) return false

      // Don't retry for 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('400')) return false
      if (error instanceof Error && error.message.includes('401')) return false
      if (error instanceof Error && error.message.includes('403')) return false

      return true
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  // Infinite scroll: fetch older messages pages
  const PAGE_SIZE = 20
  const {
    data: historyPages,
    isLoading: isLoadingMore,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: historyError,
  } = useInfiniteQuery({
    queryKey: historyQueryKey(chatId || ''),
    queryFn: async ({ pageParam = latestMessages.length }): Promise<ChatHistoryPage> => {
      if (!chatId) throw new Error('Chat ID is missing')
      const res = await api.get<ChatHistoryResponse>(
        `${endpoint}/history/${chatId}?limit=${PAGE_SIZE}&offset=${pageParam}`
      )
      return { ...res, offset: pageParam as number }
    },
    enabled: !!chatId,
    getNextPageParam: (lastPage: ChatHistoryPage) =>
      lastPage.hasMore ? lastPage.offset + PAGE_SIZE : undefined,
    initialPageParam: latestMessages.length,
  })

  // Mutation for resetting conversation
  const resetConversationMutation = useMutation({
    mutationFn: async (chatIdToReset: string | undefined) => {
      if (!chatIdToReset) throw new Error('Chat ID to reset is missing')
      const res = await api.delete<{ success: boolean; message: string }>(
        `${endpoint}/${chatIdToReset}/messages`
      )
      return res
    },
    onMutate: async () => {
      // Capture the chatId of the currently active chat at the moment of mutation.
      // This context will be used in onSuccess/onError.
      const currentActiveChat = queryClient.getQueryData<ChatInitResponse>(chatQueryKey)
      return { chatIdAtMutationStart: currentActiveChat?.chatId }
    },
    onSuccess: (data, variables, context) => {
      const resetChatId = variables // This is chatIdToReset passed to mutate()
      const activeChatIdWhenMutated = context?.chatIdAtMutationStart

      if (!resetChatId) return

      // If the chat that was active when reset was initiated is the same one that was reset
      if (activeChatIdWhenMutated === resetChatId) {
        queryClient.setQueryData<ChatInitResponse | undefined>(chatQueryKey, (oldData) => ({
          ...(oldData || {}),
          chatId: resetChatId,
          messages: [],
        }))
      } else {
        // The active chat changed since reset was initiated.
        // Invalidate the main query key to ensure the UI reflects the current active chat correctly.
        queryClient.invalidateQueries({ queryKey: chatQueryKey })
      }

      // Always remove the history for the specific chat that was reset.
      queryClient.removeQueries({ queryKey: historyQueryKey(resetChatId) })
      // And ensure the main chat query is fresh if it happened to be the one reset.
      queryClient.invalidateQueries({ queryKey: chatQueryKey })
    },
  })

  // Mutation for starting a new chat
  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      return api.post<null, { success: boolean }>('/api/chat/new')
    },
    onSuccess: () => {
      updateLatestMessages([])
      queryClient.invalidateQueries({ queryKey: chatQueryKey })
    },
  })

  // Combine pages of older messages with the most recent messages - memoized for performance
  const historyMessages = useMemo(() => {
    if (!historyPages) return []
    return historyPages.pages
      .slice()
      .reverse()
      .flatMap((page: ChatHistoryPage) => page.messages)
  }, [historyPages])

  const allMessages = useMemo(() => {
    return [...historyMessages, ...latestMessages]
  }, [historyMessages, latestMessages])

  return {
    // Full chronological messages (history + latest)
    messages: allMessages,
    // Loading states
    isLoadingHistory: isLoadingInitial,
    isFetchingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    fetchMore: fetchNextPage,
    isSending: sendMessageMutation.isPending,
    // Actions
    sendMessage: sendMessageMutation,
    resetConversation: resetConversationMutation,
    startNewChat: startNewChatMutation,
    // Errors
    error:
      initialError ||
      historyError ||
      sendMessageMutation.error ||
      resetConversationMutation.error ||
      startNewChatMutation.error,
    // Refetch function
    refetchInitial,
  }
}
