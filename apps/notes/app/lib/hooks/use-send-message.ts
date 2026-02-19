import type { ChatsSendInput } from '@hominem/hono-rpc/types/chat.types'
import type { HonoClient } from '@hominem/hono-client'

import { useChat } from '@ai-sdk/react'
import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react'
import { useMemo } from 'react'
import { useFeatureFlag } from './use-feature-flags'

export function useSendMessage({ chatId }: { chatId: string; userId?: string }) {
  const utils = useHonoUtils()
  const aiSdkChatWebEnabled = useFeatureFlag('aiSdkChatWeb')

  const chat = useChat({
    id: `chat-${chatId}`,
    api: `/api/chat-ui/${chatId}`,
    streamProtocol: 'data',
    onFinish: () => {
      utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }])
    },
    onError: () => {
      utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }])
    },
  })

  const legacySend = useHonoMutation(
    async (client: HonoClient, variables: ChatsSendInput) => {
      const response = await client.api.chats[':id'].send.$post({
        param: { id: variables.chatId || chatId },
        json: { message: variables.message },
      })
      return response.json() as Promise<unknown>
    },
    {
      onSuccess: () => {
        utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }])
      },
      onError: () => {
        utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }])
      },
    },
  )

  const mutateAsync = async (variables: ChatsSendInput) => {
    if (!aiSdkChatWebEnabled) {
      await legacySend.mutateAsync(variables)
      return { ok: true }
    }

    await chat.append({
      role: 'user',
      content: variables.message,
    })
    return { ok: true }
  }

  return useMemo(
    () => ({
      mutateAsync,
      isPending: aiSdkChatWebEnabled
        ? chat.status === 'submitted' || chat.status === 'streaming'
        : legacySend.isPending,
      status: aiSdkChatWebEnabled ? chat.status : legacySend.status,
      stop: chat.stop,
      error: aiSdkChatWebEnabled ? chat.error : legacySend.error,
    }),
    [aiSdkChatWebEnabled, chat.error, chat.status, chat.stop, legacySend.error, legacySend.isPending, legacySend.status],
  )
}
