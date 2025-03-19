import { useApiClient } from '@/lib/hooks/use-api-client'
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

export type Message = {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: ToolCalls
  toolResults?: ToolResults
  parentMessageId?: string
  messageIndex?: string
  createdAt?: string
}

type ChatOptions = {
  endpoint: CHAT_ENDPOINTS
  initialMessages?: Message[]
  showIntermediateSteps?: boolean
}

interface ChatResponse {
  messages?: Message[]
  response?: string
  steps?: ToolSet[]
  results?: ToolContent[]
  toolCalls?: ToolSet[]
  toolResults?: ToolContent[]
  parentMessageId?: string
  messageIndex?: string
}

interface SendMessageRequest {
  message: string
  show_intermediate_steps?: boolean
}
interface SingleResponseRequest {
  messages: Message[]
}
interface RetrievalRequest {
  messages: Message[]
  show_intermediate_steps?: boolean
}

type ChatRequestBody = SendMessageRequest | SingleResponseRequest | RetrievalRequest

/**
 * Hook for chat functionality
 */
export function useChat({
  endpoint,
  initialMessages = [],
  showIntermediateSteps = false,
}: ChatOptions) {
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
    (newMessages: Message[]) => {
      queryClient.setQueryData(['chat', endpoint], newMessages)
    },
    [queryClient, endpoint]
  )

  // Helper to add a single message
  const addMessage = useCallback(
    (message: Message) => {
      const newMessage = {
        ...message,
        id: message.id || Date.now().toString(),
        messageIndex: message.messageIndex || String(Date.now()),
        createdAt: message.createdAt || new Date().toISOString(),
      }
      queryClient.setQueryData(['chat', endpoint], (oldMessages: Message[] = []) => [
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
      // Add user message immediately for UI responsiveness
      const userMessage = addMessage({ role: 'user', content })

      // Prepare request body based on endpoint
      const allMessages = [...messages, userMessage]

      let requestBody: ChatRequestBody
      if (endpoint === CHAT_ENDPOINTS.CHAT) {
        requestBody = {
          message: content,
          show_intermediate_steps: showIntermediateSteps,
        }
      } else if (endpoint === CHAT_ENDPOINTS.SINGLE_RESPONSE) {
        requestBody = { messages: allMessages }
      } else {
        requestBody = {
          messages: allMessages,
          show_intermediate_steps: showIntermediateSteps,
        }
      }

      // Handle streaming endpoints
      if (endpoint === CHAT_ENDPOINTS.RETRIEVAL || endpoint === CHAT_ENDPOINTS.SINGLE_RESPONSE) {
        const response = await api.postStream(endpoint, requestBody)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('Stream reader not available')

        const decoder = new TextDecoder()
        let responseText = ''

        // Create initial streaming message
        const streamId = 'stream-response'
        addMessage({ role: 'assistant', content: '', id: streamId })

        // Process stream
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          responseText += decoder.decode(value, { stream: true })

          // Update the streaming message in the cache
          queryClient.setQueryData(['chat', endpoint], (oldMessages: Message[] = []) =>
            oldMessages.map((m) => (m.id === streamId ? { ...m, content: responseText } : m))
          )
        }

        // Finalize the message with a permanent ID
        queryClient.setQueryData(['chat', endpoint], (oldMessages: Message[] = []) =>
          oldMessages.map((m) => (m.id === streamId ? { ...m, id: Date.now().toString() } : m))
        )

        return { success: true }
      }

      // Handle non-streaming endpoints
      return api.post<ChatRequestBody, ChatResponse>(endpoint, requestBody)
    },
    onSuccess: (data) => {
      if ('success' in data) {
        console.log('Message sent successfully')
        return
      }

      // Only handle non-streaming responses here (streaming is handled in mutationFn)
      if (endpoint !== CHAT_ENDPOINTS.RETRIEVAL && endpoint !== CHAT_ENDPOINTS.SINGLE_RESPONSE) {
        if (data.messages) {
          const assistantMessage = data.messages.find((m: Message) => m.role === 'assistant')
          if (assistantMessage) {
            addMessage({
              role: 'assistant',
              content: assistantMessage.content,
              id: Date.now().toString(),
              toolCalls: assistantMessage.toolCalls,
              toolResults: assistantMessage.toolResults,
              parentMessageId: assistantMessage.parentMessageId,
              messageIndex: assistantMessage.messageIndex,
            })
          }

          // Store tool calls and results if needed
          if (showIntermediateSteps) {
            if (data.steps) setToolCalls(data.steps)
            if (data.results) setToolResults(data.results)
            if (data.toolCalls) setToolCalls(data.toolCalls)
          }
        } else if (typeof data === 'string') {
          addMessage({
            role: 'assistant',
            content: data,
            id: Date.now().toString(),
          })
        } else if (data.response) {
          addMessage({
            role: 'assistant',
            content: data.response,
            id: Date.now().toString(),
          })
        }
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
