import { openai } from '@ai-sdk/openai'
import { allTools } from '@hominem/utils/tools'
import { TRPCError } from '@trpc/server'
import { generateText } from 'ai'
import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { ChatService } from '@hominem/chat-service'
import { MessageService } from '@hominem/chat-service'
import { bindUserIdToTools } from '@hominem/utils/tools'
import { protectedProcedure, router } from '../index'

const chatService = new ChatService()
const messageService = new MessageService()

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
        const chat = await chatService.getChatById(chatId, userId, true)

        if (!chat) {
          throw new Error('Chat not found')
        }

        return { chat }
      } catch (error) {
        console.error('Failed to get chat:', error)
        throw new Error('Failed to load chat')
      }
    }),

  createChat: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { title, userId } = input

      if (!title || !userId || userId === 'anonymous') {
        throw new Error('Title and userId are required')
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
    .mutation(async ({ input }) => {
      const { chatId } = input

      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      try {
        const success = await chatService.deleteChat(chatId)
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
    .mutation(async ({ input }) => {
      const { chatId, title } = input

      if (!chatId || !title) {
        throw new Error('Chat ID and title are required')
      }

      try {
        const chat = await chatService.updateChatTitle(chatId, title)
        return { success: !!chat }
      } catch (error) {
        console.error('Failed to update chat title:', error)
        throw new Error('Failed to update chat title')
      }
    }),

  searchChats: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        query: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      const { userId, query, limit } = input

      if (!userId || userId === 'anonymous' || !query) {
        throw new Error('User ID and query are required')
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
        // Bind userId to tools that need it
        const userBoundTools = bindUserIdToTools(allTools, userId)

        // Generate AI response using messages format with tools
        const response = await generateText({
          model: openai('gpt-4.1'),
          tools: userBoundTools,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
        })

        writeFileSync(
          'debug.json',
          JSON.stringify(
            {
              userId,
              chatId: currentChat.id,
              response,
            },
            null,
            2
          )
        )

        try {
          // Save the conversation using MessageService
          await messageService.addMessage({
            chatId: currentChat.id,
            userId,
            role: 'user',
            content: message,
          })
          await messageService.addMessage({
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
          })
        }

        return {
          response: response.text,
          toolCalls: response.toolCalls || [],
          chatId: currentChat.id,
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
