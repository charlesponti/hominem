import { chatMessage, chat, type ChatMessageSelect } from '@hominem/data/schema'
import { db } from '@hominem/data'
import { logger } from '@hominem/utils/logger'
import { eq, desc, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { ChatError } from './chat.service'

// ============================================================================
// Types (moved from chat.types.ts)
// ============================================================================

export interface CreateMessageParams {
  chatId: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: Array<{
    type: 'image' | 'file'
    filename?: string
    mimeType?: string
    size?: number
    [key: string]: unknown
  }>
  toolCalls?: Array<{
    type: 'tool-call' | 'tool-result'
    toolName: string
    toolCallId?: string
    args?: Record<string, unknown>
    result?: unknown
    isError?: boolean
  }>
  reasoning?: string
  parentMessageId?: string | null
}

export interface ChatMessagesOptions {
  limit?: number
  offset?: number
  orderBy?: 'asc' | 'desc'
}

export interface AIContextMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: Array<{
    type: 'image' | 'file'
    filename?: string
    mimeType?: string
    [key: string]: unknown
  }>
}

export class MessageService {
  async addMessage(params: CreateMessageParams): Promise<ChatMessageSelect> {
    try {
      const messageId = uuidv4()
      const now = new Date().toISOString()

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
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      // Update chat's updatedAt timestamp
      await db.update(chat).set({ updatedAt: now }).where(eq(chat.id, params.chatId))

      logger.info('Message added', { messageId, chatId: params.chatId })
      return newMessage
    } catch (error) {
      logger.error('Failed to add message:', error)
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

      return await query
    } catch (error) {
      logger.error('Failed to get chat messages:', error)
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

      return message || null
    } catch (error) {
      logger.error('Failed to get message by ID:', error)
      return null
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const whereClause = and(eq(chatMessage.id, messageId), eq(chatMessage.userId, userId))

      await db.delete(chatMessage).where(whereClause)

      logger.info('Message deleted', { messageId: messageId })
      return true
    } catch (error) {
      logger.error('Failed to delete message:', error)
      return false
    }
  }

  /**
   * Convert messages to AI context format
   */
  static toAIContext(messages: ChatMessageSelect[]): AIContextMessage[] {
    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      files: msg.files || undefined,
    }))
  }
}
