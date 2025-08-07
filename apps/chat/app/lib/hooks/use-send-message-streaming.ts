import { useQueryClient } from '@tanstack/react-query'
import { type RouterOutput, trpc } from '../trpc-client'

// Get the inferred type from the tRPC query using RouterOutput
type MessageFromQuery = RouterOutput['chats']['getMessages'][0]

// Extend the inferred message type with client-side properties
type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean
}

export function useSendMessageStreaming({ chatId, userId }: { chatId: string; userId?: string }) {
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()

  const updateStreamingMessage = trpc.chats.updateStreamingMessage.useMutation()

  return trpc.chats.generateStreaming.useMutation({
    onMutate: async (variables) => {
      const currentChatId = variables.chatId || chatId

      await queryClient.cancelQueries({
        queryKey: ['chats', 'getMessages', { chatId: currentChatId, limit: 50 }],
      })

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData([
        'chats',
        'getMessages',
        { chatId: currentChatId, limit: 50 },
      ]) as ExtendedMessage[]

      // Optimistically add the user message
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
      return { previousMessages, optimisticUserMessage, currentChatId }
    },
    onSuccess: async (data, variables, context) => {
      const currentChatId = context?.currentChatId || variables.chatId || chatId

      console.log('Streaming mutation successful, updating cache for chatId:', currentChatId)

      // Update the cache with the real data from the server
      utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
        if (!oldData) return oldData

        // Remove the optimistic user message
        const filteredData = oldData.filter((msg) => !msg.id.startsWith('temp-'))

        // Use the real messages from the server response
        if (data.messages?.user && data.messages?.assistant) {
          // Add streaming flag to assistant message
          const streamingAssistantMessage = {
            ...data.messages.assistant,
            isStreaming: true,
          }

          return [...filteredData, data.messages.user, streamingAssistantMessage]
        }

        return filteredData
      })

      // Start consuming the stream
      if (data.stream) {
        let accumulatedContent = ''

        for await (const chunk of data.stream.textStream) {
          accumulatedContent += chunk

          // Update the message content in the database
          await updateStreamingMessage.mutateAsync({
            messageId: data.streamId,
            content: accumulatedContent,
          })

          // Update the cache with the new content
          utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
            if (!oldData) return oldData

            return oldData.map((msg) => {
              if (msg.id === data.streamId) {
                return {
                  ...msg,
                  content: accumulatedContent,
                  isStreaming: true,
                }
              }
              return msg
            })
          })
        }

        // Stream is complete, remove streaming flag
        utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
          if (!oldData) return oldData

          return oldData.map((msg) => {
            if (msg.id === data.streamId) {
              return {
                ...msg,
                isStreaming: false,
              }
            }
            return msg
          })
        })
      }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages && context?.currentChatId) {
        queryClient.setQueryData(
          ['chats', 'getMessages', { chatId: context.currentChatId, limit: 50 }],
          context.previousMessages
        )
      }
    },
  })
}
