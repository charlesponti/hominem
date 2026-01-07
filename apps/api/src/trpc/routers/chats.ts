import { ChatService, MessageService } from '@hominem/data/chat'
import { chat } from '@tanstack/ai'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getLMStudioAdapter } from '../../utils/llm'
import { getAvailableTools } from '../../utils/tools'
import { protectedProcedure, router } from '../procedures'

const chatService = new ChatService()
const messageService = new MessageService()

// Helper function to ensure user is authorized and chat exists
const ensureChatAndUser = async (userId: string | undefined, chatId: string | undefined) => {
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const currentChat = await chatService.getOrCreateActiveChat(userId, chatId)

  if (!currentChat) {
    throw new Error('Failed to get or create chat')
  }

  return currentChat
}

// Helper function to handle streaming errors
const handleStreamError = (error: unknown, defaultMessage: string): never => {
  console.error(defaultMessage, error)
  if (error instanceof TRPCError) {
    throw error
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: defaultMessage,
    cause: error,
  })
}

// Helper function for consistent error handling across endpoints
const handleEndpointError = (error: unknown, defaultMessage: string, operation: string): never => {
  console.error(`Failed to ${operation}:`, error)
  if (error instanceof TRPCError) {
    throw error
  }
  if (error instanceof Error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || defaultMessage,
      cause: error,
    })
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: defaultMessage,
    cause: error,
  })
}

export const chatsRouter = router({
  getUserChats: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50) }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx

      if (!userId) {
        throw new Error('Unauthorized')
      }

      const chats = await chatService.getUserChats(userId, input.limit)
      return chats
    }),

  getChatById: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { chatId } = input
      const { userId } = ctx
      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      try {
        const [chat, messages] = await Promise.all([
          chatService.getChatById(chatId, userId),
          messageService.getChatMessages(chatId, { limit: 10 }),
        ])

        if (!chat) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Chat not found',
          })
        }

        return { ...chat, messages }
      } catch (error) {
        return handleEndpointError(error, 'Failed to load chat', 'get chat')
      }
    }),

  createChat: protectedProcedure
    .input(
      z.object({
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { title } = input
      const { userId } = ctx

      if (!title) {
        throw new Error('Title is required')
      }

      if (!userId) {
        throw new Error('Unauthorized')
      }

      try {
        const chat = await chatService.createChat({ title, userId })
        return { chat }
      } catch (error) {
        return handleEndpointError(error, 'Failed to create chat', 'create chat')
      }
    }),

  deleteChat: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId } = input
      const { userId } = ctx

      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      if (!userId) {
        throw new Error('Unauthorized')
      }

      try {
        const success = await chatService.deleteChat(chatId, userId)
        return { success }
      } catch (error) {
        return handleEndpointError(error, 'Failed to delete chat', 'delete chat')
      }
    }),

  updateChatTitle: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        title: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId, title } = input
      const { userId } = ctx

      if (!(chatId && title)) {
        throw new Error('Chat ID and title are required')
      }

      if (!userId) {
        throw new Error('Unauthorized')
      }

      try {
        const chat = await chatService.updateChatTitle(chatId, title, userId)
        return { success: !!chat }
      } catch (error) {
        return handleEndpointError(error, 'Failed to update chat title', 'update chat title')
      }
    }),

  searchChats: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        query: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, limit } = input
      const { userId } = ctx

      if (!userId) {
        throw new Error('Unauthorized')
      }

      if (!query) {
        throw new Error('Query is required')
      }

      try {
        const chats = await chatService.searchChats({ userId, query, limit })
        return { chats }
      } catch (error) {
        return handleEndpointError(error, 'Failed to search chats', 'search chats')
      }
    }),

  send: protectedProcedure
    .input(
      z.object({
        message: z
          .string()
          .min(1, 'Message cannot be empty')
          .max(10000, 'Message is too long (max 10000 characters)'),
        chatId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { message, chatId } = input

      try {
        const currentChat = await ensureChatAndUser(userId, chatId)
        const startTime = Date.now()

        // Load conversation history for context (last 20 messages)
        const historyMessages = await messageService.getChatMessages(currentChat.id, {
          limit: 20,
          orderBy: 'asc',
        })

        // Save the user message first
        const userMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId,
          role: 'user',
          content: message,
        })

        // Add the new user message to context
        const messagesWithNewUser = [
          ...historyMessages.map((m) => ({
            role: m.role,
            content: m.content,
            toolCalls: m.toolCalls?.map((m) => ({
              id: m.toolCallId,
              function: {
                name: m.toolName,
                arguments: JSON.stringify(m.args),
              },
              type: 'function' as const,
            })),
          })),
          {
            role: 'user' as const,
            content: message,
          },
        ]

        // Create chat stream using TanStack AI directly
        // Uses LM Studio adapter for OpenAI-compatible endpoint
        const adapter = getLMStudioAdapter()
        const stream = chat({
          adapter,
          tools: getAvailableTools(userId),
          messages: messagesWithNewUser,
        })

        // Create a placeholder for the assistant message
        const assistantMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId: '', // Assistant messages don't have a userId
          role: 'assistant',
          content: '', // Will be updated as we stream
        })

        if (!assistantMessage) {
          throw new Error('Failed to create assistant message')
        }

        // Accumulate the stream and update the assistant message only once at the end
        let accumulatedContent = ''
        const toolCalls = []

        try {
          for await (const event of stream) {
            if (event.type === 'content') {
              accumulatedContent += event.content
            } else if (event.type === 'tool_call') {
              toolCalls.push(event.toolCall)
            }
          }
          await messageService.updateMessage({
            messageId: assistantMessage.id,
            content: accumulatedContent,
            toolCalls: toolCalls.map((tc) => ({
              toolName: tc.function.name,
              type: 'tool-call',
              toolCallId: tc.id,
              args: JSON.parse(tc.function.arguments) as Record<string, string>,
            })),
          })
        } catch (streamError) {
          console.error('Error consuming stream:', streamError)
          await messageService.updateMessage({
            messageId: assistantMessage.id,
            content: accumulatedContent || '[Error: Stream processing failed]',
          })
        }

        return {
          streamId: assistantMessage.id,
          chatId: currentChat.id,
          chatTitle: currentChat.title,
          messages: {
            user: userMessage,
            assistant: assistantMessage,
          },
          metadata: {
            startTime: startTime,
            timestamp: new Date().toISOString(),
          },
        }
      } catch (error) {
        return handleStreamError(error, 'Failed to send message with streaming')
      }
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId } = ctx
      const { chatId, limit, offset } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      const messages = await messageService.getChatMessages(chatId, {
        limit,
        offset,
      })
      return messages
    }),
})
