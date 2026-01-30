import { logger } from '@hominem/utils/logger';

import {
  createChatQuery,
  getChatByIdQuery,
  getOrCreateActiveChatQuery,
  getUserChatsQuery,
  updateChatTitleQuery,
  deleteChatQuery,
  clearChatMessagesQuery,
} from './chat.queries';
import {
  type ChatMessageOutput,
  type ChatOutput,
  type CreateChatParams,
  type SearchChatsParams,
  ChatError,
} from './chat.types';

// Re-export ChatError so internal modules can import it from './chat.service'
export { ChatError } from './chat.types';

export class ChatService {
  async createChat(params: CreateChatParams): Promise<ChatOutput> {
    try {
      return await createChatQuery(params);
    } catch (error) {
      logger.error('Failed to create chat', { error });
      throw new ChatError('DATABASE_ERROR', 'Failed to create chat conversation');
    }
  }

  async getChatById(chatId: string, userId: string): Promise<ChatOutput | null> {
    try {
      return await getChatByIdQuery(chatId, userId);
    } catch (error) {
      logger.error(`Failed to get chat:: ${error}`);
      if (error instanceof Error && error.message.includes('Access denied')) {
        throw error;
      }
      return null;
    }
  }

  async getOrCreateActiveChat(
    userId: string,
    chatId?: string,
    onChatDoesNotExist?: (chatId: string) => Promise<void>,
  ): Promise<ChatOutput> {
    try {
      const chat = await getOrCreateActiveChatQuery(userId, chatId);
      if (!chat && chatId) {
        await onChatDoesNotExist?.(chatId);
      }
      return chat;
    } catch (error) {
      logger.error(`Error creating or fetching chat:: ${error}`);
      throw new ChatError('DATABASE_ERROR', 'Failed to get or create active chat');
    }
  }

  async getUserChats(userId: string, limit = 50): Promise<ChatOutput[]> {
    try {
      return await getUserChatsQuery(userId, limit);
    } catch (error) {
      logger.error(`Failed to get user chats:: ${error}`);
      return [];
    }
  }

  async updateChatTitle(chatId: string, title: string, userId?: string): Promise<ChatOutput> {
    try {
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      const updatedChat = await updateChatTitleQuery(chatId, title);
      if (!updatedChat) {
        throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
      }

      logger.info(`Chat title updated: ${chatId} - "${title}"`);
      return updatedChat;
    } catch (error) {
      logger.error(`Failed to update chat title:: ${error}`);
      if (error instanceof ChatError) throw error;
      throw new ChatError('DATABASE_ERROR', 'Failed to update chat title');
    }
  }

  async updateChatTitleFromConversation(
    chatId: string,
    messages: ChatMessageOutput[],
  ): Promise<ChatOutput | null> {
    try {
      const currentChat = await getChatByIdQuery(chatId, ''); // userId is not needed here
      if (!currentChat || !currentChat.title.startsWith('New Chat')) {
        return currentChat;
      }

      const lastMessages = messages.slice(-3);
      if (lastMessages.length > 0) {
        const messageSummary = lastMessages.map((m) => m.content.slice(0, 30)).join(' ... ');
        const title =
          messageSummary.length > 50 ? `${messageSummary.slice(0, 47)}...` : messageSummary;

        const updatedChat = await updateChatTitleQuery(chatId, title);
        logger.info(`Chat title auto-updated: ${chatId} - "${title}"`);
        return updatedChat || null;
      }
    } catch (error) {
      logger.error(`Failed to update chat title from conversation: ${error}`);
    }

    return null;
  }

  async deleteChat(chatId: string, userId?: string): Promise<boolean> {
    try {
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      await deleteChatQuery(chatId);
      logger.info(`Chat deleted: ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete chat:: ${error}`);
      if (error instanceof ChatError) throw error;
      return false;
    }
  }

  async searchChats(params: SearchChatsParams): Promise<ChatOutput[]> {
    try {
      const userChats = await getUserChatsQuery(params.userId, params.limit);
      return userChats.filter((c) => c.title.toLowerCase().includes(params.query.toLowerCase()));
    } catch (error) {
      logger.error(`Failed to search chats:: ${error}`);
      return [];
    }
  }

  async clearChatMessages(chatId: string, userId?: string): Promise<boolean> {
    try {
      if (userId) {
        const existingChat = await this.getChatById(chatId, userId);
        if (!existingChat) {
          throw new ChatError('CHAT_NOT_FOUND', 'Chat not found');
        }
      }

      await clearChatMessagesQuery(chatId);
      logger.info(`Chat messages cleared: ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to clear chat messages:: ${error}`);
      if (error instanceof ChatError) throw error;
      return false;
    }
  }
}
