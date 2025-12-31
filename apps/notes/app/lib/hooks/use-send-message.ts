import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { trpc } from '../trpc'
import type { ExtendedMessage } from '../types/chat-message'

export function useSendMessage({
  chatId,
  userId,
}: {
  chatId: string
  userId?: string
}): ReturnType<typeof trpc.chats.generate.useMutation> {
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousContentLengthRef = useRef<number>(0)
  const unchangedPollsRef = useRef<number>(0)
  const currentPollIntervalRef = useRef<number>(200)
  const streamIdRef = useRef<string | null>(null)
  const chatIdRef = useRef<string>(chatId)

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    // Reset polling state
    previousContentLengthRef.current = 0
    unchangedPollsRef.current = 0
    currentPollIntervalRef.current = 200
  }

  const markStreamingComplete = (currentChatId: string, messageId: string) => {
    utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
      if (!oldData) return oldData
      return oldData.map((msg) => (msg.id === messageId ? { ...msg, isStreaming: false } : msg))
    })
  }

  const pollForUpdates = (currentChatId: string, messageId: string) => {
    if (!pollingIntervalRef.current) return

    utils.chats.getMessages.invalidate({
      chatId: currentChatId,
      limit: 50,
    })

    // Check if streaming is complete by comparing content length
    const messages = queryClient.getQueryData([
      'chats',
      'getMessages',
      { chatId: currentChatId, limit: 50 },
    ]) as ExtendedMessage[] | undefined

    if (messages) {
      const streamingMessage = messages.find((msg) => msg.id === messageId)
      if (streamingMessage) {
        const currentLength = streamingMessage.content?.length || 0
        const previousLength = previousContentLengthRef.current

        if (currentLength === previousLength && currentLength > 0) {
          // Content hasn't changed
          unchangedPollsRef.current += 1

          // If unchanged for 2 consecutive polls, streaming is complete
          if (unchangedPollsRef.current >= 2) {
            stopPolling()
            markStreamingComplete(currentChatId, messageId)
            streamIdRef.current = null
            return
          }

          // Increase polling interval (exponential backoff)
          if (currentPollIntervalRef.current < 1000) {
            currentPollIntervalRef.current = Math.min(currentPollIntervalRef.current * 2, 1000)
            // Restart polling with new interval (ensure cleanup first)
            const oldInterval = pollingIntervalRef.current
            pollingIntervalRef.current = setInterval(
              () => pollForUpdates(currentChatId, messageId),
              currentPollIntervalRef.current
            )
            // Clear old interval after setting new one to prevent race condition
            if (oldInterval) {
              clearInterval(oldInterval)
            }
          }
        } else {
          // Content changed, reset unchanged counter and use fast polling
          unchangedPollsRef.current = 0
          previousContentLengthRef.current = currentLength

          // If we're not at the fastest interval, restart with fast polling
          if (currentPollIntervalRef.current > 200) {
            currentPollIntervalRef.current = 200
            // Restart polling with fast interval (ensure cleanup first)
            const oldInterval = pollingIntervalRef.current
            pollingIntervalRef.current = setInterval(
              () => pollForUpdates(currentChatId, messageId),
              currentPollIntervalRef.current
            )
            // Clear old interval after setting new one to prevent race condition
            if (oldInterval) {
              clearInterval(oldInterval)
            }
          }
        }
      } else {
        // Message not found, streaming might be complete
        stopPolling()
        streamIdRef.current = null
      }
    }
  }

  const mutation = trpc.chats.generate.useMutation({
    onMutate: async (variables) => {
      const currentChatId = variables.chatId || chatId
      chatIdRef.current = currentChatId

      await queryClient.cancelQueries({
        queryKey: ['chats', 'getMessages', { chatId: currentChatId, limit: 50 }],
      })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData([
        'chats',
        'getMessages',
        { chatId: currentChatId, limit: 50 },
      ]) as ExtendedMessage[]

      const optimisticUserMessage: ExtendedMessage = {
        id: `temp-${Date.now()}`,
        chatId: currentChatId,
        userId: userId || '',
        role: 'user',
        content: variables.message,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        toolCalls: null,
        reasoning: null,
        files: null,
        parentMessageId: null,
        messageIndex: null,
      }

      // Update the cache optimistically with just the user message
      queryClient.setQueryData(
        ['chats', 'getMessages', { chatId: currentChatId, limit: 50 }],
        (old: ExtendedMessage[] = []) => [...old, optimisticUserMessage]
      )

      // Return a context object with the snapshotted value
      return {
        previousMessages,
        optimisticUserMessage,
        currentChatId,
        streamId: null as string | null,
      }
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages && context?.currentChatId) {
        queryClient.setQueryData(
          ['chats', 'getMessages', { chatId: context.currentChatId, limit: 50 }],
          context.previousMessages
        )
      }
      // Stop polling on error
      stopPolling()
      streamIdRef.current = null
    },
    onSuccess: (data, variables, context) => {
      const currentChatId = context?.currentChatId || variables.chatId || chatId
      chatIdRef.current = currentChatId
      const streamId = data.streamId
      streamIdRef.current = streamId

      // Reset polling state for new stream
      previousContentLengthRef.current = 0
      unchangedPollsRef.current = 0
      currentPollIntervalRef.current = 200

      // Update the cache with the initial streaming response data
      utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
        if (!oldData) return oldData

        // Remove the optimistic user message
        const filteredData = oldData.filter((msg) => !msg.id.startsWith('temp-'))

        // Use the real messages from the server response if available
        if (data.messages?.user && data.messages?.assistant) {
          // Mark the assistant message as streaming
          const streamingAssistantMessage: ExtendedMessage = {
            ...data.messages.assistant,
            isStreaming: true,
          }
          // Return the updated messages array with real data from server
          return [...filteredData, data.messages.user, streamingAssistantMessage]
        }

        // Fallback: create messages from response data
        const realUserMessage: ExtendedMessage = {
          id: `user-${Date.now()}`,
          chatId: currentChatId,
          userId: userId || '',
          role: 'user',
          content: variables.message,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolCalls: null,
          reasoning: null,
          files: null,
          parentMessageId: null,
          messageIndex: null,
        }

        const assistantMessage: ExtendedMessage = {
          id: streamId || `assistant-${Date.now()}`,
          chatId: currentChatId,
          userId: '',
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolCalls: null,
          reasoning: null,
          files: null,
          parentMessageId: null,
          messageIndex: null,
          isStreaming: true,
        }

        return [...filteredData, realUserMessage, assistantMessage]
      })

      // Start polling for message updates while streaming
      if (streamId) {
        // Start with fast polling (200ms)
        pollingIntervalRef.current = setInterval(() => pollForUpdates(currentChatId, streamId), 200)
      }
    },
  })

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
      streamIdRef.current = null
    }
  }, [])

  return mutation
}
