import { db } from '@hominem/db';
import { and, desc, eq, gt } from '@hominem/db';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { logger } from '@hominem/utils/logger';

import type { ChatMessageInput, ChatMessageOutput } from '../contracts';
import { ChatError } from './chat.types';

const chatMessageRoleEnum = pgEnum('chat_message_role', ['system', 'user', 'assistant', 'tool']);

const chatsTable = pgTable('chat', {
  id: uuid('id').primaryKey().notNull(),
  title: text('title').notNull(),
  userId: uuid('user_id').notNull(),
  noteId: uuid('note_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

const chatMessagesTable = pgTable('chat_message', {
  id: uuid('id').primaryKey().notNull(),
  chatId: uuid('chat_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: chatMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  files: jsonb('files'),
  toolCalls: jsonb('tool_calls'),
  reasoning: text('reasoning'),
  parentMessageId: uuid('parent_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

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

export class MessageService {
  async addMessage(params: CreateMessageParams): Promise<ChatMessageOutput | null> {
    try {
      const messageId = crypto.randomUUID();

      const [newMessage] = await db
        .insert(chatMessagesTable)
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
        .returning();

      if (!newMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to create message - no record returned');
      }

      await db
        .update(chatsTable)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(chatsTable.id, params.chatId));

      return newMessage as ChatMessageOutput;
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
        .select()
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.chatId, chatId))
        .limit(options.limit ?? 50)
        .offset(options.offset ?? 0)
        .orderBy(
          options.orderBy === 'desc' ? desc(chatMessagesTable.createdAt) : chatMessagesTable.createdAt,
        );

      const results = await query;
      return results as ChatMessageOutput[];
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
      const whereClause = and(eq(chatMessagesTable.id, messageId), eq(chatMessagesTable.userId, userId));
      const [message] = await db.select().from(chatMessagesTable).where(whereClause).limit(1);

      if (!message) {
        throw new ChatError('AUTH_ERROR', 'Message not found or access denied');
      }

      return message as ChatMessageOutput;
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
      const [updatedMessage] = await db
        .update(chatMessagesTable)
        .set({
          content,
          toolCalls,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chatMessagesTable.id, messageId))
        .returning();

      if (!updatedMessage) {
        throw new ChatError('DATABASE_ERROR', 'Failed to update message - no record returned');
      }

      return updatedMessage as ChatMessageOutput;
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
        .delete(chatMessagesTable)
        .where(and(eq(chatMessagesTable.id, messageId), eq(chatMessagesTable.userId, userId)));

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
      const [chatData] = await db
        .select()
        .from(chatsTable)
        .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
        .limit(1);

      if (!chatData) {
        throw new ChatError('AUTH_ERROR', 'Chat not found or access denied');
      }

      // Delete all messages created after the timestamp
      const deletedMessages = await db
        .delete(chatMessagesTable)
        .where(and(eq(chatMessagesTable.chatId, chatId), gt(chatMessagesTable.createdAt, afterTimestamp)))
        .returning();

      const deletedCount = deletedMessages.length;
      return deletedCount;
    } catch (error) {
      logger.error(`Failed to delete messages after timestamp: ${error}`);
      if (error instanceof ChatError) {
        throw error;
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to delete subsequent messages');
    }
  }
}
