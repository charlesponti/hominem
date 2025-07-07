import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { trpc } from '../trpc-client'

interface UseSendMessageOptions {
  chatId: string
  userId: string
}

interface SendMessageOptions {
  files?: Array<{
    type: 'image' | 'file'
    filename?: string
    mimeType?: string
    size?: number
  }>
}

export function useSendMessage({ chatId, userId }: UseSendMessageOptions) {
  const queryClient = useQueryClient()

  // Send message mutation
  const sendMessageMutation = trpc.messages.addMessage.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chats', 'getChatById', { chatId }],
      })
    },
  })

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      if (!chatId) {
        throw new Error('No chat ID provided')
      }

      return await sendMessageMutation.mutateAsync({
        chatId,
        userId,
        role: 'user',
        content,
        files: options?.files,
      })
    },
    [sendMessageMutation, chatId, userId]
  )

  return {
    sendMessage,
    isSending: sendMessageMutation.isPending,
    error: sendMessageMutation.error,
  }
}
