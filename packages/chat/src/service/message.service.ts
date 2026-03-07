import crypto from 'node:crypto';

import { db } from '@hominem/db';
import type { Database, Json } from '@hominem/db';
import { logger } from '@hominem/utils/logger';
import type { Selectable } from 'kysely';

import type { ChatMessageInput, ChatMessageOutput, ChatMessageRole } from '../contracts';
import { ChatError } from './chat.types';

type ChatMessageRow = Selectable<Database['chat_message']>;

export type CreateMessageParams = {
  chatId: ChatMessageOutput['chatId'];
  userId: ChatMessageOutput['userId'];
  role: ChatMessageOutput['role'];
  content: ChatMessageOutput['content'];
  files?: ChatMessageOutput['files'];
  toolCalls?: ChatMessageOutput['toolCalls'];
  reasoning?: string;
  parentMessageId?: string | null;
};

export interface ChatMessagesOptions {
  limit?: number | undefined;
  offset?: number | undefined;
  orderBy?: 'asc' | 'desc' | undefined;
}

function toMessageOutput(row: ChatMessageRow): ChatMessageOutput {
  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    role: row.role as ChatMessageRole,
    content: row.content,
    files: row.files as ChatMessageOutput['files'],
    toolCalls: row.tool_calls as ChatMessageOutput['toolCalls'],
    reasoning: row.reasoning ?? null,
    parentMessageId: row.parent_message_id,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

export class MessageService {
  async addMessage(params: CreateMessageParams): Promise<ChatMessageOutput | null> {
    try {
      const messageId = crypto.randomUUID();

      const newMessage = await db
        .insertInto('chat_message')
        .values({
          id: messageId,
          chat_id: params.chatId,
          user_id: params.userId,
          role: params.role,
          content: params.content,
          files: params.files as Json,
          tool_calls: params.toolCalls as Json,
          reasoning: params.reasoning ?? null,
          parent_message_id: params.parentMessageId ?? null,
        })
        .returningAll()
        .executeTakeFirst();

      if (!newMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to create message - no record returned');
      }

      await db
        .updateTable('chat')
        .set({ updated_at: new Date().toISOString() })
        .where('id', '=', params.chatId)
        .execute();

      return toMessageOutput(newMessage);
    } catch (error) {
      logger.error(`Failed to add message: ${error}`);
      throw new ChatError('DATABASE_ERROR', 'Failed to add message to conversation');
    }
  }

  /**
   * Get messages for a chat conversation
   */
  async getChatMessages(
    chatId: string,
    options: ChatMessagesOptions = { limit: 10, offset: 0, orderBy: 'asc' },
  ): Promise<ChatMessageOutput[]> {
    try {
      const query = db
        .selectFrom('chat_message')
        .selectAll()
        .where('chat_id', '=', chatId)
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0)
        .orderBy('created_at', options.orderBy === 'desc' ? 'desc' : 'asc');

      const results = await query.execute();
      return results.map(toMessageOutput);
    } catch (error) {
      logger.error(`Failed to get chat messages: ${error}`);
      return [];
    }
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(messageId: string, userId: string): Promise<ChatMessageOutput | null> {
    try {
      const message = await db
        .selectFrom('chat_message')
        .selectAll()
        .where('id', '=', messageId)
        .where('user_id', '=', userId)
        .limit(1)
        .executeTakeFirst();

      if (!message) {
        throw new ChatError('AUTH_ERROR', 'Message not found or access denied');
      }

      return toMessageOutput(message);
    } catch (error) {
      logger.error(`Failed to get message by ID: ${error}`);
      return null;
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
    messageId: string;
    content: string;
    toolCalls?: ChatMessageInput['toolCalls'];
  }): Promise<ChatMessageOutput | null> {
    try {
      const updatedMessage = await db
        .updateTable('chat_message')
        .set({
          content,
          tool_calls: toolCalls as Json,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', messageId)
        .returningAll()
        .executeTakeFirst();

      if (!updatedMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to update message - no record returned');
      }

      return toMessageOutput(updatedMessage);
    } catch (error) {
      logger.error(`Failed to update message: ${error}`);
      return null;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      await db
        .deleteFrom('chat_message')
        .where('id', '=', messageId)
        .where('user_id', '=', userId)
        .execute();

      return true;
    } catch (error) {
      logger.error(`Failed to delete message: ${error}`);
      return false;
    }
  }

  /**
   * Delete all messages in a chat created after a given timestamp
   */
  async deleteMessagesAfter(
    chatId: string,
    afterTimestamp: string,
    userId: string,
  ): Promise<number> {
    try {
      // Verify chat ownership first
      const chatData = await db
        .selectFrom('chat')
        .select('id')
        .where('id', '=', chatId)
        .where('user_id', '=', userId)
        .limit(1)
        .executeTakeFirst();

      if (!chatData) {
        throw new ChatError('AUTH_ERROR', 'Chat not found or access denied');
      }

      // Delete all messages created after the timestamp
      const deletedMessages = await db
        .deleteFrom('chat_message')
        .where('chat_id', '=', chatId)
        .where('created_at', '>', new Date(afterTimestamp).toISOString())
        .returningAll()
        .execute();

      return deletedMessages.length;
    } catch (error) {
      logger.error(`Failed to delete messages after timestamp: ${error}`);
      if (error instanceof ChatError) {
        throw error;
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to delete subsequent messages');
    }
  }
}
