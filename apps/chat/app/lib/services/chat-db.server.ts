import { db } from '@hominem/utils/db'
import { chat, chatMessage, type Chat, type ChatMessageSelect } from '@hominem/utils/schema'
import { and, desc, eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export interface CreateChatParams {
  title: string
  userId: string
}

export interface CreateMessageParams {
  chatId: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: Array<{
    type: 'image' | 'file'
    filename?: string
    mimeType?: string
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
  parentMessageId?: string
  messageIndex?: string
}

export interface ChatWithMessages extends Chat {
  messages: ChatMessageSelect[]
}

export class ChatDatabaseService {
  /**
   * Create a new chat conversation
   */
  static async createChat(params: CreateChatParams): Promise<Chat> {
    try {
      const chatId = uuidv4()

      const [newChat] = await db
        .insert(chat)
        .values({
          id: chatId,
          title: params.title,
          userId: params.userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return newChat
    } catch (error) {
      console.error('Failed to create chat:', error)
      throw new Error('Failed to create chat conversation')
    }
  }

  /**
   * Get a chat by ID with optional message inclusion
   */
  static async getChatById(
    chatId: string,
    includeMessages = false
  ): Promise<ChatWithMessages | null> {
    try {
      const [chatData] = await db.select().from(chat).where(eq(chat.id, chatId)).limit(1)

      if (!chatData) {
        return null
      }

      let messages: ChatMessageSelect[] = []

      if (includeMessages) {
        messages = await db
          .select()
          .from(chatMessage)
          .where(eq(chatMessage.chatId, chatId))
          .orderBy(chatMessage.createdAt)
      }

      return {
        ...chatData,
        messages,
      }
    } catch (error) {
      console.error('Failed to get chat:', error)
      return null
    }
  }

  /**
   * Get all chats for a user
   */
  static async getUserChats(userId: string, limit = 50): Promise<Chat[]> {
    try {
      const chats = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, userId))
        .orderBy(desc(chat.updatedAt))
        .limit(limit)

      return chats
    } catch (error) {
      console.error('Failed to get user chats:', error)
      return []
    }
  }

  /**
   * Add a message to a chat conversation
   */
  static async addMessage(params: CreateMessageParams): Promise<ChatMessageSelect> {
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
          messageIndex: params.messageIndex,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      // Update chat's updatedAt timestamp
      await db.update(chat).set({ updatedAt: now }).where(eq(chat.id, params.chatId))

      return newMessage
    } catch (error) {
      console.error('Failed to add message:', error)
      throw new Error('Failed to add message to conversation')
    }
  }

  /**
   * Get messages for a chat conversation
   */
  static async getChatMessages(chatId: string, limit = 100): Promise<ChatMessageSelect[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessage)
        .where(eq(chatMessage.chatId, chatId))
        .orderBy(chatMessage.createdAt)
        .limit(limit)

      return messages
    } catch (error) {
      console.error('Failed to get chat messages:', error)
      return []
    }
  }

  /**
   * Update chat title
   */
  static async updateChatTitle(chatId: string, title: string): Promise<boolean> {
    try {
      await db
        .update(chat)
        .set({
          title,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chat.id, chatId))

      return true
    } catch (error) {
      console.error('Failed to update chat title:', error)
      return false
    }
  }

  /**
   * Delete a chat and all its messages
   */
  static async deleteChat(chatId: string): Promise<boolean> {
    try {
      await db.delete(chat).where(eq(chat.id, chatId))
      return true
    } catch (error) {
      console.error('Failed to delete chat:', error)
      return false
    }
  }

  /**
   * Update message content (for streaming updates)
   */
  static async updateMessage(messageId: string, content: string): Promise<boolean> {
    try {
      await db
        .update(chatMessage)
        .set({
          content,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chatMessage.id, messageId))

      return true
    } catch (error) {
      console.error('Failed to update message:', error)
      return false
    }
  }

  /**
   * Get conversation context for AI (recent messages)
   */
  static async getConversationContext(
    chatId: string,
    maxMessages = 20
  ): Promise<
    Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      files?: any[]
    }>
  > {
    try {
      const messages = await db
        .select({
          role: chatMessage.role,
          content: chatMessage.content,
          files: chatMessage.files,
          createdAt: chatMessage.createdAt,
        })
        .from(chatMessage)
        .where(eq(chatMessage.chatId, chatId))
        .orderBy(desc(chatMessage.createdAt))
        .limit(maxMessages)

      // Reverse to get chronological order
      return messages.reverse().map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        files: msg.files || undefined,
      }))
    } catch (error) {
      console.error('Failed to get conversation context:', error)
      return []
    }
  }

  /**
   * Search chats by title or content
   */
  static async searchChats(userId: string, query: string, limit = 20): Promise<Chat[]> {
    try {
      // Simple text search - in production you might want to use full-text search
      const chats = await db
        .select()
        .from(chat)
        .where(
          and(
            eq(chat.userId, userId)
            // Note: This is a simple LIKE search. For better search, consider using PostgreSQL's full-text search
          )
        )
        .orderBy(desc(chat.updatedAt))
        .limit(limit)

      return chats.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    } catch (error) {
      console.error('Failed to search chats:', error)
      return []
    }
  }

  /**
   * Get chat statistics for a user
   */
  static async getUserChatStats(userId: string): Promise<{
    totalChats: number
    totalMessages: number
    recentActivity: Date | null
  }> {
    try {
      const userChats = await db.select().from(chat).where(eq(chat.userId, userId))

      const totalChats = userChats.length

      if (totalChats === 0) {
        return {
          totalChats: 0,
          totalMessages: 0,
          recentActivity: null,
        }
      }

      const chatIds = userChats.map((c) => c.id)

      // Get total message count for user's chats
      const messages = await db.select().from(chatMessage).where(eq(chatMessage.userId, userId))

      const totalMessages = messages.length

      // Get most recent activity
      const recentActivity = userChats.reduce(
        (latest, chat) => {
          const chatDate = new Date(chat.updatedAt)
          return !latest || chatDate > latest ? chatDate : latest
        },
        null as Date | null
      )

      return {
        totalChats,
        totalMessages,
        recentActivity,
      }
    } catch (error) {
      console.error('Failed to get user chat stats:', error)
      return {
        totalChats: 0,
        totalMessages: 0,
        recentActivity: null,
      }
    }
  }
}
