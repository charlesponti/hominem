import { useApiClient } from '@/lib/hooks/use-api-client'
import { useAuth } from '@clerk/nextjs'
import type { ChatMessageSelect } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ToolContent, ToolSet } from 'ai'
import { useCallback, useState } from 'react'

export type ToolCalls = ToolSet[]
export type ToolResults = ToolContent[]

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

type UseChatOptions = {
  endpoint: CHAT_ENDPOINTS
  initialMessages?: ChatMessageSelect[]
  showDebugInfo?: boolean
  stream?: boolean
}

/**
 * Hook for chat functionality
 */
export function useChat({
  endpoint,
  stream,
  initialMessages = [],
  showDebugInfo = false,
}: UseChatOptions) {
  const { userId } = useAuth()
  // Use local state only for tool-related data that doesn't belong in the main message flow
  const [toolCalls, setToolCalls] = useState<ToolSet[]>([])
  const [toolResults, setToolResults] = useState<ToolContent[]>([])

  const api = useApiClient()
  const queryClient = useQueryClient()

  // Query for messages
  const {
    data: messages = initialMessages,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch,
  } = useQuery({
    queryKey: ['chat', endpoint],
    queryFn: async () => {
      const response = await api.get<null, ChatResponse>(endpoint)
      return response.messages || initialMessages
    },
  })

  // Helper to update message cache
  const updateMessages = useCallback(
    (newMessages: ChatMessageSelect[]) => {
      queryClient.setQueryData(['chat', endpoint], newMessages)
    },
    [queryClient, endpoint]
  )

  // Helper to add a single message
  const addMessage = useCallback(
    (message: ChatMessageSelect) => {
      const newMessage = {
        ...message,
        id: message.id || crypto.randomUUID(),
        messageIndex: message.messageIndex || String(Date.now()),
        createdAt: message.createdAt || new Date().toISOString(),
      }
      queryClient.setQueryData(['chat', endpoint], (oldMessages: ChatMessageSelect[] = []) => [
        ...oldMessages,
        newMessage,
      ])
      return newMessage
    },
    [queryClient, endpoint]
  )

  // Mutation for sending a message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!userId) return

      // Add user message immediately for UI responsiveness
      const userMessage = addMessage({
        role: 'user',
        content: content,
        toolCalls: [],
        chatId: crypto.randomUUID(),
        id: crypto.randomUUID(),
        reasoning: null,
        parentMessageId: null,
        messageIndex: String(Date.now()),
        createdAt: new Date().toISOString(),
        files: [],
        updatedAt: new Date().toISOString(),
        userId,
      })

      // Handle streaming endpoints
      if (stream) {
        const response = await api.postStream(endpoint, {
          messages: [userMessage],
          showDebugInfo,
        })
        const reader = response.body?.getReader()
        if (!reader) throw new Error('Stream reader not available')

        const decoder = new TextDecoder()
        let responseText = ''

        // Create initial streaming message
        const streamId = 'stream-response'
        const streamMessage: ChatMessageSelect = {
          role: 'assistant',
          content: '',
          id: streamId,
          chatId: crypto.randomUUID(),
          userId: userId,
          toolCalls: null,
          reasoning: null,
          files: null,
          parentMessageId: null,
          messageIndex: String(Date.now()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        addMessage(streamMessage)

        // Process stream
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          responseText += decoder.decode(value, { stream: true })

          // Update the streaming message in the cache
          queryClient.setQueryData(['chat', endpoint], (oldMessages: ChatMessageSelect[] = []) =>
            oldMessages.map((m) => (m.id === streamId ? { ...m, content: responseText } : m))
          )
        }

        // Finalize the message with a permanent ID
        queryClient.setQueryData(['chat', endpoint], (oldMessages: ChatMessageSelect[] = []) =>
          oldMessages.map((m) => (m.id === streamId ? { ...m, id: crypto.randomUUID() } : m))
        )

        return { success: true }
      }

      // Handle non-streaming endpoints
      const requestBody = {
        messages: initialMessages,
        message: content,
      }
      return api.post<SendMessageRequest, ChatResponse>(endpoint, requestBody)
    },
    onSuccess: (data) => {
      if (!data) return

      if ('success' in data) {
        return
      }

      if (data.messages) {
        queryClient.setQueryData(['chat', endpoint], (oldMessages: ChatMessageSelect[] = []) => [
          ...oldMessages,
          ...data.messages.map((message) => ({
            ...message,
            id: message.id || crypto.randomUUID(),
            messageIndex: message.messageIndex || String(Date.now()),
            createdAt: message.createdAt || new Date().toISOString(),
          })),
        ])
      }

      // Invalidate the query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['chat', endpoint] })
    },
    onError: (error) => {
      console.error('Chat error:', error)
    },
  })

  // Mutation for resetting conversation
  const resetConversationMutation = useMutation({
    mutationFn: async () => {
      // This could be an API call if needed
      return { success: true }
    },
    onSuccess: () => {
      updateMessages(initialMessages)
      setToolCalls([])
      setToolResults([])
      queryClient.invalidateQueries({ queryKey: ['chat', endpoint] })
    },
  })

  // Mutation for starting a new chat
  const startNewChatMutation = useMutation({
    mutationFn: async () => {
      return api.post<null, { success: boolean }>('/api/chat/new')
    },
    onSuccess: () => {
      updateMessages(initialMessages)
      setToolCalls([])
      setToolResults([])
      queryClient.invalidateQueries({ queryKey: ['chat', endpoint] })
    },
  })

  return {
    messages,
    isLoading: isLoadingMessages,
    sendMessage: sendMessageMutation,
    resetConversation: resetConversationMutation,
    startNewChat: startNewChatMutation,
    error:
      messagesError ||
      sendMessageMutation.error ||
      resetConversationMutation.error ||
      startNewChatMutation.error,
    toolCalls,
    toolResults,
    refetch,
  }
}
