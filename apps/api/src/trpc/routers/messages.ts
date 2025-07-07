import { z } from 'zod'
import { MessageService } from '@hominem/chat-service'
import { protectedProcedure, router } from '../index'

export const messagesRouter = router({
  getMessageById: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { messageId } = input
      const { user } = ctx

      const messageService = new MessageService()

      try {
        const message = await messageService.getMessageById(messageId, user.id)
        return { message }
      } catch (error) {
        console.error('Failed to get message:', error)
        throw new Error('Failed to load message')
      }
    }),

  // Add a new message
  addMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        userId: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        files: z
          .array(
            z.object({
              type: z.enum(['image', 'file']),
              filename: z.string().optional(),
              mimeType: z.string().optional(),
              size: z.number().optional(),
            })
          )
          .optional(),
        toolCalls: z.array(z.any()).optional(),
        reasoning: z.string().optional(),
        parentMessageId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { chatId, userId, role, content, files, toolCalls, reasoning, parentMessageId } = input

      if (!chatId || !userId || !role || !content) {
        throw new Error('Chat ID, user ID, role, and content are required')
      }

      const messageService = new MessageService()

      try {
        const message = await messageService.addMessage({
          chatId,
          userId,
          role,
          content,
          files,
          toolCalls,
          reasoning,
          parentMessageId,
        })

        const transformedMessage = {
          id: message.id,
          role: message.role as 'user' | 'assistant' | 'system',
          content: message.content,
          createdAt: new Date(message.createdAt),
        }

        return { message: transformedMessage }
      } catch (error) {
        console.error('Failed to add message:', error)
        throw new Error('Failed to add message')
      }
    }),

  // Delete message
  deleteMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { messageId } = input
      const { user } = ctx

      if (!messageId) {
        throw new Error('Message ID is required')
      }

      const messageService = new MessageService()

      try {
        const success = await messageService.deleteMessage(messageId, user.id)
        return { success }
      } catch (error) {
        console.error('Failed to delete message:', error)
        throw new Error('Failed to delete message')
      }
    }),
})
