import { openai } from '@ai-sdk/openai'
import { ChatService, MessageService } from '@hominem/chat-service'
import type { ChatMessageSelect } from '@hominem/data/schema'
import { allTools } from '@hominem/data/tools'
import { TRPCError } from '@trpc/server'
import type { Tool, ToolExecutionOptions, ToolSet } from 'ai'
import { generateText, streamText } from 'ai'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures.js'

const chatService = new ChatService()
const messageService = new MessageService()

const withUserContextTools = (tools: ToolSet, userId: string): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => {
      if (!tool || typeof tool.execute !== 'function') {
        return [name, tool]
      }

      const wrappedTool: Tool = {
        ...tool,
        execute: async (args: Record<string, unknown>, options: ToolExecutionOptions) =>
          tool.execute!({ ...args, userId }, options),
      }

      return [name, wrappedTool]
    })
  )

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
          throw new Error('Chat not found')
        }

        return { ...chat, messages }
      } catch (error) {
        console.error('Failed to get chat:', error)
        throw new Error('Failed to load chat')
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
        console.error('Failed to create chat:', error)
        throw new Error('Failed to create chat')
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
        console.error('Failed to delete chat:', error)
        throw new Error('Failed to delete chat')
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

      if (!chatId || !title) {
        throw new Error('Chat ID and title are required')
      }

      if (!userId) {
        throw new Error('Unauthorized')
      }

      try {
        const chat = await chatService.updateChatTitle(chatId, title, userId)
        return { success: !!chat }
      } catch (error) {
        console.error('Failed to update chat title:', error)
        throw new Error('Failed to update chat title')
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
        console.error('Failed to search chats:', error)
        throw new Error('Failed to search chats')
      }
    }),

  generate: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        chatId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { message, chatId } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      // Get or create chat
      const currentChat = await chatService.getOrCreateActiveChat(userId, chatId)

      if (!currentChat) {
        throw new Error('Failed to get or create chat')
      }

      try {
        const startTime = Date.now()

        const userContextTools = withUserContextTools(allTools, userId)

        // Generate AI response using messages format with tools
        const response = await generateText({
          model: openai('gpt-4.1'),
          tools: userContextTools,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        })

        let userMessage: ChatMessageSelect | null = null
        let assistantMessage: ChatMessageSelect | null = null

        try {
          // Save the conversation using MessageService
          userMessage = await messageService.addMessage({
            chatId: currentChat.id,
            userId,
            role: 'user',
            content: message,
          })
          assistantMessage = await messageService.addMessage({
            chatId: currentChat.id,
            userId,
            role: 'assistant',
            content: response.text || '',
          })
        } catch (saveError) {
          console.error('Error saving conversation:', saveError)
          // Continue even if saving fails, but log the error
        }

        // If there's no text and no tool calls, something went wrong.
        if (!response.text && response.toolCalls.length === 0) {
          console.error('No text or tool calls in AI response')
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'No response text or tool calls generated',
            cause: 'AI model returned empty response',
          })
        }

        return {
          // Core response data
          response: response.text,
          toolCalls: response.toolCalls || [],

          // Chat context
          chatId: currentChat.id,
          chatTitle: currentChat.title,

          // Saved messages with proper typing
          messages: {
            user: userMessage,
            assistant: assistantMessage,
          },

          // Metadata for UI state management
          metadata: {
            hasToolCalls: response.toolCalls.length > 0,
            responseLength: response.text?.length || 0,
            timestamp: new Date().toISOString(),
            model: 'gpt-4.1',
            processingTime: Date.now() - startTime,
          },
        }
      } catch (error) {
        console.error('Error generating chat response:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate response',
          cause: error,
        })
      }
    }),

  generateStreaming: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        chatId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { message, chatId } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      // Get or create chat
      const currentChat = await chatService.getOrCreateActiveChat(userId, chatId)

      if (!currentChat) {
        throw new Error('Failed to get or create chat')
      }

      try {
        const startTime = Date.now()

        const userContextTools = withUserContextTools(allTools, userId)

        // Save the user message first
        const userMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId,
          role: 'user',
          content: message,
        })

        // Create a streaming response
        const stream = await streamText({
          model: openai('gpt-4.1'),
          tools: userContextTools,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        })

        // Create a placeholder for the assistant message
        const assistantMessage = await messageService.addMessage({
          chatId: currentChat.id,
          userId: '', // Assistant messages don't have a userId
          role: 'assistant',
          content: '', // Will be updated as we stream
        })

        // Return the initial response with streaming info
        return {
          // Streaming context
          streamId: assistantMessage.id,
          chatId: currentChat.id,
          chatTitle: currentChat.title,

          // Saved messages
          messages: {
            user: userMessage,
            assistant: assistantMessage,
          },

          // Metadata
          metadata: {
            model: 'gpt-4.1',
            startTime: startTime,
            timestamp: new Date().toISOString(),
          },

          // Stream object for client to consume
          stream,
        }
      } catch (error) {
        console.error('Error generating streaming chat response:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate streaming response',
          cause: error,
        })
      }
    }),

  updateStreamingMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx
      const { messageId, content } = input

      if (!userId) {
        throw new Error('Unauthorized')
      }

      try {
        const updatedMessage = await messageService.updateMessage(messageId, content)

        if (!updatedMessage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Message not found or could not be updated',
          })
        }

        return {
          message: updatedMessage,
          success: true,
        }
      } catch (error) {
        console.error('Error updating streaming message:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update streaming message',
          cause: error,
        })
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

      const messages = await messageService.getChatMessages(chatId, { limit, offset })
      return messages
    }),
})
