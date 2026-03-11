import type { Chat, ChatMessage as RpcChatMessage } from '@hominem/hono-rpc/types'
import type { ApiClient } from '@hominem/hono-client'

import { useApiClient } from '@hominem/hono-client/react'
import NetInfo from '@react-native-community/netinfo'
import { useMutation, useQuery, useQueryClient, type MutationOptions } from '@tanstack/react-query'
import { randomUUID } from 'expo-crypto'
import { useState } from 'react'

import type { Chat as LocalChat } from '~/utils/local-store/types'
import { LocalStore } from '~/utils/local-store'
import { log } from '../../logger'
import {
  createOptimisticMessage,
  getChatRetryDelayMs,
  reconcileMessagesAfterSend,
  type MessageOutput,
} from './chat-contract'
import { selectSherpaChat } from './session-state'

type SendChatMessageOutput = {
  messages: MessageOutput[]
  function_calls: string[]
}

function toMessageOutput(message: RpcChatMessage): MessageOutput | null {
  if (message.role === 'tool') {
    return null
  }

  return {
    id: message.id,
    role: message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: message.reasoning,
    toolCalls: message.toolCalls ?? null,
    isStreaming: false,
  }
}

// Single source of truth: React Query cache
// SQLite is persistence layer only, updated after successful mutations
export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useApiClient()
  const _queryClient = useQueryClient()

  return useQuery<MessageOutput[]>({
    queryKey: ['chatMessages', chatId],
    queryFn: async () => {
      const messages = await client.chats.getMessages({
        chatId,
        limit: 50,
      })

      const mapped = messages.flatMap((message) => {
        const output = toMessageOutput(message)
        return output ? [output] : []
      })

      persistMessages(chatId, mapped).catch((err) => {
        console.warn('[chat] Failed to persist messages:', err)
      })

      return mapped
    },
    enabled: Boolean(chatId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })
}

export type ChatSendStatus = 'idle' | 'submitted' | 'streaming' | 'error'

// Consolidated send message with optimistic updates
export const useSendMessage = ({ chatId }: { chatId: string }) => {
  const client = useApiClient()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [sendChatError, setSendChatError] = useState(false)
  const [chatSendStatus, setChatSendStatus] = useState<ChatSendStatus>('idle')

  const mutation = useMutation<
    SendChatMessageOutput,
    Error,
    string,
    { previousMessages: MessageOutput[] }
  >({
    mutationKey: ['sendChatMessage', chatId],

    // Optimistic update
    onMutate: async (messageText) => {
      setChatSendStatus('submitted')
      const text = messageText.trim()
      if (!text) {
        return { previousMessages: [] }
      }

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chatMessages', chatId] })

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<MessageOutput[]>(['chatMessages', chatId]) || []

      // Optimistically add user message
      const optimisticMessage = createOptimisticMessage(chatId, text, generateId())

      queryClient.setQueryData(['chatMessages', chatId], [...previousMessages, optimisticMessage])

      return { previousMessages }
    },

    mutationFn: async (messageText) => {
      const status = await NetInfo.fetch()
      if (!status.isConnected) {
        throw new Error('offline_unavailable')
      }

      const payload = await client.chats.send({
        chatId,
        message: messageText.trim(),
      })
      setChatSendStatus('streaming')
      const mappedMessages = [payload.messages.user, payload.messages.assistant].flatMap((message) => {
        const output = toMessageOutput(message)
        return output ? [output] : []
      })

      // Persist to SQLite
      await persistMessages(chatId, mappedMessages)

      return {
        messages: mappedMessages,
        function_calls: [],
      }
    },

    // On success, update cache with server data
    onSuccess: (data) => {
      setSendChatError(false)
      setChatSendStatus('idle')
      queryClient.setQueryData(['chatMessages', chatId], (old: MessageOutput[] | undefined) => {
        if (!old) {
          return data.messages
        }
        return reconcileMessagesAfterSend(old, data.messages)
      })
    },

    // Rollback on error
    onError: (error, variables, context) => {
      log('Error sending chat message:', error)
      setSendChatError(true)
      setChatSendStatus('error')
      if (context?.previousMessages) {
        queryClient.setQueryData(['chatMessages', chatId], context.previousMessages)
      }
    },
  })

  return {
    message,
    setMessage,
    sendChatError,
    setSendChatError,
    chatSendStatus,
    isChatSending: mutation.isPending,
    sendChatMessage: async (nextMessageText = message) => {
      const text = nextMessageText.trim()
      if (!text) {
        return {
          messages: [],
          function_calls: [],
        }
      }
      const result = await mutation.mutateAsync(text)
      setMessage('')
      return result
    },
  }
}

// Simplified start chat - uses React Query retry instead of custom queue
export const useStartChat = ({
  userMessage,
  _sherpaMessage,
  _intentId,
  _seedPrompt,
  ...props
}: {
  userMessage: string
  _sherpaMessage: string
  _intentId?: string
  _seedPrompt?: string
} & MutationOptions<LocalChat, Error, void>) => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<LocalChat, Error, void>({
    mutationKey: ['startChat'],
    retry: 3,
    retryDelay: getChatRetryDelayMs,
    
    mutationFn: async () => {
      const status = await NetInfo.fetch()
      if (!status.isConnected) {
        // React Query will handle retry when back online
        throw new Error('offline_retry')
      }

      const chat = await startRemoteChat(client, userMessage)

      await LocalStore.createChat({
        id: chat.id,
        createdAt: chat.createdAt,
        endedAt: null,
        title: chat.title ?? null,
      })

      if (userMessage) {
        await persistMessages(chat.id, [
          {
            id: generateId(),
            role: 'user',
            message: userMessage,
            created_at: new Date().toISOString(),
            chat_id: chat.id,
            profile_id: '',
            focus_ids: null,
            focus_items: null,
            toolCalls: null,
          },
        ])
      }

      return {
        id: chat.id,
        createdAt: chat.createdAt,
        endedAt: null,
        title: chat.title,
      }
    },
    
    onSuccess: () => {
      // Invalidate active chat list
      queryClient.invalidateQueries({ queryKey: ['activeChatLocal'] })
    },
    ...props,
  })
}

export const useEndChat = ({
  chatId,
  ...props
}: { chatId: string } & MutationOptions<LocalChat, Error, void>) => {
  const queryClient = useQueryClient()

  return useMutation<LocalChat, Error, void>({
    mutationKey: ['endChat', chatId],
    mutationFn: async () => {
      const endedAt = new Date().toISOString()
      const updatedChat = await LocalStore.endChat(chatId, endedAt)
      return updatedChat
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeChatLocal'] })
    },
    ...props,
  })
}

export const useActiveChat = (chatId?: string | null) => {
  return useQuery<LocalChat | null>({
    queryKey: ['activeChatLocal', chatId ?? null],
    queryFn: async () => {
      const chats = await LocalStore.listChats()
      return selectSherpaChat(chats, chatId)
    },
  })
}

async function startRemoteChat(
  client: ApiClient,
  initialMessage: string
): Promise<Chat> {
  const title = initialMessage.trim().slice(0, 64) || 'Sherpa chat'

  const chat = await client.chats.create({
    title,
  })

  if (initialMessage.trim()) {
    await client.chats.send({
      chatId: chat.id,
      message: initialMessage,
    })
  }

  return chat
}

const generateId = () => randomUUID()

const persistMessages = async (chatId: string, messages: MessageOutput[]) => {
  await Promise.all(
    messages.map((msg) =>
      LocalStore.addMessage({
        id: msg.id ?? generateId(),
        chatId,
        role: msg.role,
        content: msg.message ?? '',
        reasoning: msg.reasoning ?? null,
        toolCalls: msg.toolCalls ?? null,
        isStreaming: msg.isStreaming,
        focusItemsJson: msg.focus_items ? JSON.stringify(msg.focus_items) : null,
        focusIdsJson: msg.focus_ids ? JSON.stringify(msg.focus_ids) : null,
        createdAt: msg.created_at ?? new Date().toISOString(),
      })
    )
  )
}
