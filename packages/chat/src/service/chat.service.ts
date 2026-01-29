import { db, takeUniqueOrThrow } from '@hominem/db';
import { type ChatOutput, type ChatMessageOutput, chat, chatMessage } from '@hominem/db/schema';
import { logger } from '@hominem/utils/logger';
import { and, desc, eq } from 'drizzle-orm';

export interface CreateChatParams {
  title: string;
  userId: string;
}

export interface SearchChatsParams {
  userId: string;
  query: string;
  limit?: number;
}

export interface ChatStats {
  totalChats: number;
  totalMessages: number;
  averageMessagesPerChat: number;
  recentActivity: Date | null;
}

export class ChatError extends Error {
  constructor(
    public type:
      | 'VALIDATION_ERROR'
      | 'DATABASE_ERROR'
      | 'CHAT_NOT_FOUND'
      | 'MESSAGE_NOT_FOUND'
      | 'AUTH_ERROR',
    message: string,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ChatError';
  }
}

export class ChatService {
  async createChat(params: CreateChatParams): Promise<ChatOutput> {
    try {
      const chatId = crypto.randomUUID();
      const now = new Date().toISOString();

      const [newChat] = await db
        .insert(chat)
        .values({
          id: chatId,
          title: params.title,
          userId: params.userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return newChat;
    } catch (error) {
      logger.error('Failed to create chat', { error });
      throw new ChatError('DATABASE_ERROR', 'Failed to create chat conversation');
    }
  }

  async getChatById(chatId: string, userId: string): Promise<ChatOutput | null> {
    try {
      const [chatData] = await db
        .select()
        .from(chat)
        .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
        .limit(1);

      return chatData;
    } catch (error) {
      logger.error(`Failed to get chat:: ${error}`);
      if (error instanceof Error && error.message.includes('Access denied')) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get or create an active chat for a user
   */
  async getOrCreateActiveChat(
    userId: string,
    chatId?: string,
    onChatDoesNotExist?: (chatId: string) => Promise<void>,
  ): Promise<ChatOutput> {
    try {
      if (chatId) {
        const existingChat = await db
          .select()
          .from(chat)
          .where(eq(chat.id, chatId))
          .limit(1)
          .then(takeUniqueOrThrow)
          .catch(() => null);

        if (!existingChat) {
          await onChatDoesNotExist?.(chatId);
        }

        if (existingChat) {
          return existingChat;
        }
      }

      // Create new chat if chatId wasn't provided or chat wasn't found
      const newChat = await db
        .insert(chat)
        .values({
          id: crypto.randomUUID(),
          title: 'New Chat',
          userId: userId,
        })
        .returning()
        .then(takeUniqueOrThrow);

      logger.info(`Active chat created: ${newChat.id} for user ${userId}`);
      return newChat;
    } catch (error) {
      logger.error(`Error creating or fetching chat:: ${error}`);
      throw new ChatError('DATABASE_ERROR', 'Failed to get or create active chat');
    }
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string, limit = 50): Promise<ChatOutput[]> {
    try {
      const chats = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, userId))
        .orderBy(desc(chat.updatedAt))
        .limit(limit);

      return chats;
    } catch (error) {
      logger.error(`Failed to get user chats:: ${error}`);
      return [];
    }
  }

  /**
   * Update chat title
   */
  async updateChatTitle(chatId: string, title: string, userId?: string): Promise<ChatOutput> {
    try {
      // Get chat to validate ownership if userId is provided
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      const [updatedChat] = await db
        .update(chat)
        .set({
          title: title,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chat.id, chatId))
        .returning();

      if (!updatedChat) {
        throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
      }

      logger.info(`Chat title updated: ${chatId} - "${title}"`);
      return updatedChat;
    } catch (error) {
      logger.error(`Failed to update chat title:: ${error}`);
      if (error instanceof Error && error.message.includes('Chat not found')) {
        throw error;
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to update chat title');
    }
  }

  /**
   * Update chat title based on conversation content
   */
  async updateChatTitleFromConversation(
    chatId: string,
    messages: ChatMessageOutput[],
  ): Promise<ChatOutput | null> {
    try {
      // Only update if there are a few messages and the title is still default
      const currentChat = await db
        .select()
        .from(chat)
        .where(eq(chat.id, chatId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!currentChat?.title.startsWith('New Chat')) {
        return currentChat;
      }

      // Generate a more descriptive title
      const lastMessages = messages.slice(-3);
      if (lastMessages.length > 0) {
        const messageSummary = lastMessages.map((m) => m.content.slice(0, 30)).join(' ... ');
        const title =
          messageSummary.length > 50 ? `${messageSummary.slice(0, 47)}...` : messageSummary;

        const [updatedChat] = await db
          .update(chat)
          .set({ title })
          .where(eq(chat.id, chatId))
          .returning();

        logger.info(`Chat title auto-updated: ${chatId} - "${title}"`);
        return updatedChat;
      }
    } catch (error) {
      logger.error(`Failed to update chat title from conversation: ${error}`);
    }

    return null;
  }

  /**
   * Delete a chat and all its messages
   */
  async deleteChat(chatId: string, userId?: string): Promise<boolean> {
    try {
      // Get chat to validate ownership if userId is provided
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      // First, delete all messages associated with the chat
      await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));

      // Then, delete the chat itself
      await db.delete(chat).where(eq(chat.id, chatId));

      logger.info(`Chat deleted: ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete chat:: ${error}`);
      if (error instanceof Error && error.message.includes('Chat not found')) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Search chats by title or content
   */
  async searchChats(params: SearchChatsParams): Promise<ChatOutput[]> {
    try {
      const chats = await db
        .select()
        .from(chat)
        .where(eq(chat.userId, params.userId))
        .orderBy(desc(chat.updatedAt))
        .limit(params.limit || 20);

      return chats.filter((c) => c.title.toLowerCase().includes(params.query.toLowerCase()));
    } catch (error) {
      logger.error(`Failed to search chats:: ${error}`);
      return [];
    }
  }

  /**
   * Clear all messages for a specific chat
   */
  async clearChatMessages(chatId: string, userId?: string): Promise<boolean> {
    try {
      // Get chat to validate ownership if userId is provided
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));

      logger.info(`Chat messages cleared: ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to clear chat messages:: ${error}`);
      if (error instanceof Error && error.message.includes('Chat not found')) {
        throw error;
      }
      return false;
    }
  }
}
