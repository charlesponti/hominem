import { z } from 'zod'
import { ChatDatabaseService } from '../../services/chat-db.server.js'
import { protectedProcedure, publicProcedure, router } from '../../trpc'

export const chatsRouter = router({
  // Get user chats
  getUserChats: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const { userId, limit } = input

      if (!userId || userId === 'anonymous') {
        return { chats: [] }
      }

      try {
        const chats = await ChatDatabaseService.getUserChats(userId, limit)
        return { chats }
      } catch (error) {
        console.error('Failed to get user chats:', error)
        throw new Error('Failed to load chats')
      }
    }),

  // Get specific chat by ID
  getChatById: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { chatId } = input

      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      try {
        const chat = await ChatDatabaseService.getChatById(chatId, true)

        if (!chat) {
          throw new Error('Chat not found')
        }

        return { chat }
      } catch (error) {
        console.error('Failed to get chat:', error)
        throw new Error('Failed to load chat')
      }
    }),

  // Create new chat
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
        const chat = await ChatDatabaseService.createChat({ title, userId })
        return { chat }
      } catch (error) {
        console.error('Failed to create chat:', error)
        throw new Error('Failed to create chat')
      }
    }),

  // Delete chat
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
        const success = await ChatDatabaseService.deleteChat(chatId)
        return { success }
      } catch (error) {
        console.error('Failed to delete chat:', error)
        throw new Error('Failed to delete chat')
      }
    }),

  // Update chat title
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
        const success = await ChatDatabaseService.updateChatTitle(chatId, title)
        return { success }
      } catch (error) {
        console.error('Failed to update chat title:', error)
        throw new Error('Failed to update chat title')
      }
    }),

  // Get chat stats
  getChatStats: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { userId } = input

      if (!userId || userId === 'anonymous') {
        throw new Error('User ID is required')
      }

      try {
        const stats = await ChatDatabaseService.getUserChatStats(userId)
        return { stats }
      } catch (error) {
        console.error('Failed to get chat stats:', error)
        throw new Error('Failed to get chat statistics')
      }
    }),

  // Search chats
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
        const chats = await ChatDatabaseService.searchChats(userId, query, limit)
        return { chats }
      } catch (error) {
        console.error('Failed to search chats:', error)
        throw new Error('Failed to search chats')
      }
    }),
})
