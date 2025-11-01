import { useQueryClient } from '@tanstack/react-query'
import { type RouterOutput, trpc } from '../trpc'

// Get the inferred type from the tRPC query using RouterOutput
type MessageFromQuery = RouterOutput['chats']['getMessages'][0]

// Extend the inferred message type with client-side properties
type ExtendedMessage = MessageFromQuery & {
  isStreaming?: boolean
}

export function useSendMessage({ chatId, userId }: { chatId: string; userId?: string }) {
  const queryClient = useQueryClient()
  const utils = trpc.useUtils()

  return trpc.chats.generate.useMutation({
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
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages && context?.currentChatId) {
        queryClient.setQueryData(
          ['chats', 'getMessages', { chatId: context.currentChatId, limit: 50 }],
          context.previousMessages
        )
      }
    },
    onSuccess: (data, variables, context) => {
      const currentChatId = context?.currentChatId || variables.chatId || chatId

      // Update the cache with the real data from the server
      utils.chats.getMessages.setData({ chatId: currentChatId, limit: 50 }, (oldData) => {
        if (!oldData) return oldData

        // Remove the optimistic user message
        const filteredData = oldData.filter((msg) => !msg.id.startsWith('temp-'))

        // Use the real messages from the server response if available
        if (data.messages?.user && data.messages?.assistant) {
          // Return the updated messages array with real data from server
          return [...filteredData, data.messages.user, data.messages.assistant]
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
          id: `assistant-${Date.now()}`,
          chatId: currentChatId,
          userId: '',
          role: 'assistant',
          content: data.response || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolCalls: data.toolCalls || null,
          reasoning: null,
          files: null,
          parentMessageId: null,
          messageIndex: null,
        }

        return [...filteredData, realUserMessage, assistantMessage]
      })
    },
  })
}
