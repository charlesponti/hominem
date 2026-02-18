import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation, useQuery, type MutationOptions } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { captureException } from '@sentry/react-native'
import type { Chat, ChatMessage } from '@hominem/hono-rpc/types'

import { useHonoClient } from '@hominem/hono-client/react'
import { LocalStore } from '~/utils/local-store'
import type { Chat as LocalChat, ChatMessage as LocalChatMessage } from '~/utils/local-store/types'
import { log } from '../../logger'
import queryClient from '../../query-client'

export type MessageOutput = {
  id: string
  role: 'user' | 'assistant' | 'system'
  message: string
  created_at: string
  chat_id: string
  profile_id: string
  focus_ids: string[] | null
  focus_items: string[] | null
}

type SendChatMessageOutput = {
  messages: MessageOutput[]
  function_calls: string[]
}

type StartChatPayload = {
  user_message: string
  sherpa_message: string
  intent_id?: string
  seed_prompt?: string
}

const START_QUEUE_KEY = '@start_chat_queue'

function toMessageOutput(message: ChatMessage): MessageOutput {
  return {
    id: message.id,
    role: message.role === 'tool' ? 'assistant' : message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
  }
}

export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useHonoClient()
  const [localMessages, setLocalMessages] = useState<MessageOutput[]>([])
  const [isLoadingLocal, setIsLoadingLocal] = useState(true)

  useEffect(() => {
    let isMounted = true
    if (!chatId) return

    setIsLoadingLocal(true)
    LocalStore.listMessages(chatId)
      .then((messages) => {
        if (!isMounted) return
        setLocalMessages(messages.map(toLocalMessageOutput))
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoadingLocal(false)
      })

    return () => {
      isMounted = false
    }
  }, [chatId])

  const query = useQuery<MessageOutput[]>({
    queryKey: ['chatMessages', chatId],
    queryFn: async () => {
      const response = await client.api.chats[':id'].messages.$get({
        param: { id: chatId },
      })
      const remote = (await response.json()) as ChatMessage[]
      const mapped = remote.map(toMessageOutput)
      await persistMessages(chatId, mapped)
      return mapped
    },
    enabled: Boolean(chatId) && localMessages.length === 0,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  return {
    ...query,
    data: localMessages.length > 0 ? localMessages : query.data,
    isPending: isLoadingLocal || query.isPending,
  }
}

export const useSendMessage = ({
  chatId,
}: {
  chatId: string
}) => {
  const client = useHonoClient()
  const [message, setMessage] = useState('')
  const [sendChatError, setSendChatError] = useState(false)

  const { mutateAsync: sendChatMessage, isPending: isChatSending } = useMutation({
    mutationKey: ['sendChatMessage', chatId],
    mutationFn: async () => {
      const userMessage: MessageOutput = {
        id: generateId(),
        role: 'user',
        message,
        created_at: new Date().toISOString(),
        chat_id: chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      }
      await persistMessages(chatId, [userMessage])

      const response = await client.api.chats[':id'].send.$post({
        param: { id: chatId },
        json: { message },
      })

      const payload = (await response.json()) as {
        messages: {
          user: ChatMessage
          assistant: ChatMessage
        }
      }

      const mappedMessages = [toMessageOutput(payload.messages.user), toMessageOutput(payload.messages.assistant)]
      await persistMessages(chatId, mappedMessages)

      return {
        messages: mappedMessages,
        function_calls: [],
      } as SendChatMessageOutput
    },
    onSuccess: (response) => {
      setMessage('')
      setSendChatError(false)

      if (response.function_calls.indexOf('create_tasks') > -1) {
        queryClient.invalidateQueries({ queryKey: ['focusItems'] })
      }

      queryClient.setQueryData(['chatMessages', chatId], (old: MessageOutput[] | undefined) => [
        ...(old ?? []),
        ...response.messages,
      ])
    },
    onError: (error) => {
      log('Error sending chat message:', error)
      captureException(error)
    },
  })

  return {
    message,
    isChatSending,
    sendChatMessage,
    setMessage,
    sendChatError,
    setSendChatError,
  }
}

export const useStartChat = ({
  userMessage,
  sherpaMessage,
  intentId,
  seedPrompt,
  ...props
}: { userMessage: string; sherpaMessage: string; intentId?: string; seedPrompt?: string } & MutationOptions<LocalChat>) => {
  const client = useHonoClient()

  const payload: StartChatPayload = {
    user_message: userMessage,
    sherpa_message: sherpaMessage,
    intent_id: intentId,
    seed_prompt: seedPrompt,
  }

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected) return

      const queued = await AsyncStorage.getItem(START_QUEUE_KEY)
      if (!queued) return

      const parsed = JSON.parse(queued) as StartChatPayload[]
      await AsyncStorage.removeItem(START_QUEUE_KEY)

      for (const queuedPayload of parsed) {
        try {
          await startRemoteChat(client, queuedPayload.user_message)
        } catch (error) {
          captureException(error)
        }
      }
    })

    return () => unsubscribe()
  }, [client])

  return useMutation<LocalChat>({
    mutationKey: ['startChat'],
    mutationFn: async () => {
      const status = await NetInfo.fetch()
      if (!status.isConnected) {
        const existing = await AsyncStorage.getItem(START_QUEUE_KEY)
        const queued = existing ? (JSON.parse(existing) as StartChatPayload[]) : []
        await AsyncStorage.setItem(START_QUEUE_KEY, JSON.stringify([...queued, payload]))
        throw new Error('queued_offline')
      }

      const chat = await startRemoteChat(client, payload.user_message)

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
    ...props,
  })
}

export const useEndChat = ({ chatId, ...props }: { chatId: string } & MutationOptions<LocalChat>) => {
  return useMutation<LocalChat>({
    mutationKey: ['endChat', chatId],
    mutationFn: async () => {
      const endedAt = new Date().toISOString()
      const updatedChat = await LocalStore.endChat(chatId, endedAt)
      return updatedChat
    },
    ...props,
  })
}

export const useActiveChat = () => {
  return useQuery<LocalChat | null>({
    queryKey: ['activeChatLocal'],
    queryFn: async () => {
      const chats = await LocalStore.listChats()
      const active = chats.find((chat) => !chat.endedAt)
      return active ?? null
    },
  })
}

async function startRemoteChat(client: ReturnType<typeof useHonoClient>, initialMessage: string): Promise<Chat> {
  const title = initialMessage.trim().slice(0, 64) || 'Sherpa chat'

  const chatResponse = await client.api.chats.$post({
    json: { title },
  })

  const chat = (await chatResponse.json()) as Chat

  if (initialMessage.trim()) {
    await client.api.chats[':id'].send.$post({
      param: { id: chat.id },
      json: { message: initialMessage },
    })
  }

  return chat
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const toLocalMessageOutput = (message: LocalChatMessage): MessageOutput => ({
  id: message.id,
  role: message.role,
  message: message.content,
  created_at: message.createdAt,
  chat_id: message.chatId,
  profile_id: '',
  focus_ids: message.focusIdsJson ? (JSON.parse(message.focusIdsJson) as string[]) : null,
  focus_items: message.focusItemsJson ? (JSON.parse(message.focusItemsJson) as string[]) : null,
})

const persistMessages = async (chatId: string, messages: MessageOutput[]) => {
  await Promise.all(
    messages.map((msg) =>
      LocalStore.addMessage({
        id: msg.id ?? generateId(),
        chatId,
        role: msg.role,
        content: msg.message ?? '',
        focusItemsJson: msg.focus_items ? JSON.stringify(msg.focus_items) : null,
        focusIdsJson: msg.focus_ids ? JSON.stringify(msg.focus_ids) : null,
        createdAt: msg.created_at ?? new Date().toISOString(),
      })
    )
  )
}
