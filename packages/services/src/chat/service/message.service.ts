import { logger } from '@hominem/utils/logger'
import { and, desc, eq, gt } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@hominem/db'
import { type ChatMessageInsert, type ChatMessageSelect, chat, chatMessage } from '@hominem/db/schema'
import { ChatError } from './chat.service'

export type CreateMessageParams = {
  chatId: ChatMessageSelect['chatId']
  userId: ChatMessageSelect['userId']
  role: ChatMessageSelect['role']
  content: ChatMessageSelect['content']
  files?: Array<{
    type: 'image' | 'file'
    filename?: string
    mimeType?: string
    size?: number
    [key: string]: unknown
  }>
  toolCalls?: ChatMessageSelect['toolCalls']
  reasoning?: string
  parentMessageId?: string | null
}

export interface ChatMessagesOptions {
  limit?: number
  offset?: number
  orderBy?: 'asc' | 'desc'
}

export class MessageService {
  async addMessage(params: CreateMessageParams): Promise<ChatMessageSelect | null> {
    try {
      const messageId = uuidv4()

      const [newMessage] = await db
        .insert(chatMessage)
        .values({
          id: messageId,
          chatId: params.chatId,
          userId: params.userId,
          role: params.role,
          content: params.content,
          files: params.files,
          toolCalls: params.toolCalls,
          reasoning: params.reasoning,
          parentMessageId: params.parentMessageId,
        })
        .returning()

      if (!newMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to create message - no record returned')
      }

      await db
        .update(chat)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(chat.id, params.chatId))

      return newMessage
    } catch (error) {
      logger.error(`Failed to add message: ${error}`)
      throw new ChatError('DATABASE_ERROR', 'Failed to add message to conversation')
    }
  }

  /**
   * Get messages for a chat conversation
   */
  async getChatMessages(
    chatId: string,
    options: ChatMessagesOptions = { limit: 10, offset: 0, orderBy: 'asc' }
  ): Promise<ChatMessageSelect[]> {
    try {
      const query = db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.chatId, chatId))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0)
        .orderBy(options.orderBy === 'desc' ? desc(chatMessage.createdAt) : chatMessage.createdAt)

      const results = await query
      return results
    } catch (error) {
      logger.error(`Failed to get chat messages: ${error}`)
      return []
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: string, userId: string): Promise<ChatMessageSelect | null> {
    try {
      const whereClause = and(eq(chatMessage.id, messageId), eq(chatMessage.userId, userId))
      const [message] = await db.select().from(chatMessage).where(whereClause).limit(1)

      if (!message) {
        throw new ChatError('AUTH_ERROR', 'Message not found or access denied')
      }

      return message
    } catch (error) {
      logger.error(`Failed to get message by ID: ${error}`)
      return null
    }
  }

  /**
   * Update a message content
   */
  async updateMessage({
    messageId,
    content,
    toolCalls,
  }: {
    messageId: string
    content: string
    toolCalls?: ChatMessageInsert['toolCalls']
  }): Promise<ChatMessageSelect | null> {
    try {
      const [updatedMessage] = await db
        .update(chatMessage)
        .set({
          content,
          toolCalls,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chatMessage.id, messageId))
        .returning()

      if (!updatedMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to update message - no record returned')
      }

      return updatedMessage
    } catch (error) {
      logger.error(`Failed to update message: ${error}`)
      return null
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      await db
        .delete(chatMessage)
        .where(and(eq(chatMessage.id, messageId), eq(chatMessage.userId, userId)))

      return true
    } catch (error) {
      logger.error(`Failed to delete message: ${error}`)
      return false
    }
  }

  /**
   * Delete all messages in a chat created after a given timestamp
   */
  async deleteMessagesAfter(
    chatId: string,
    afterTimestamp: string,
    userId: string
  ): Promise<number> {
    try {
      // Verify chat ownership first
      const [chatData] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
        .limit(1)

      if (!chatData) {
        throw new ChatError('AUTH_ERROR', 'Chat not found or access denied')
      }

      // Delete all messages created after the timestamp
      const deletedMessages = await db
        .delete(chatMessage)
        .where(and(eq(chatMessage.chatId, chatId), gt(chatMessage.createdAt, afterTimestamp)))
        .returning()

      const deletedCount = deletedMessages.length
      return deletedCount
    } catch (error) {
      logger.error(`Failed to delete messages after timestamp: ${error}`)
      if (error instanceof ChatError) {
        throw error
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to delete subsequent messages')
    }
  }
}
