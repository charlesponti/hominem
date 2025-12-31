import { MessageService } from '@hominem/data/chat'
import { z } from 'zod'
import { protectedProcedure, router } from '../procedures'

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

  // Update message
  updateMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        content: z.string().min(1, 'Message content cannot be empty'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { messageId, content } = input
      const { user } = ctx

      if (!messageId) {
        throw new Error('Message ID is required')
      }

      const messageService = new MessageService()

      try {
        // Verify message belongs to user
        const message = await messageService.getMessageById(messageId, user.id)
        if (!message) {
          throw new Error('Message not found or not authorized')
        }

        // Only allow editing user messages
        if (message.role !== 'user') {
          throw new Error('Only user messages can be edited')
        }

        // Delete all messages created after this message's timestamp
        await messageService.deleteMessagesAfter(message.chatId, message.createdAt, user.id)

        // Update the message content
        const updatedMessage = await messageService.updateMessage(messageId, content)
        return { message: updatedMessage }
      } catch (error) {
        console.error('Failed to update message:', error)
        throw new Error(error instanceof Error ? error.message : 'Failed to update message')
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

  // Delete messages after a timestamp
  deleteMessagesAfter: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        afterTimestamp: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { chatId, afterTimestamp } = input
      const { user } = ctx

      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      if (!afterTimestamp) {
        throw new Error('After timestamp is required')
      }

      const messageService = new MessageService()

      try {
        const deletedCount = await messageService.deleteMessagesAfter(
          chatId,
          afterTimestamp,
          user.id
        )
        return { deletedCount }
      } catch (error) {
        console.error('Failed to delete messages after timestamp:', error)
        throw new Error(
          error instanceof Error ? error.message : 'Failed to delete subsequent messages'
        )
      }
    }),
})
