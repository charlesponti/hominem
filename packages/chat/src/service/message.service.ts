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

function toIsoString(value: string | Date | null | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(0).toISOString();
}

function normalizeParentMessageId(parentMessageId?: string | null): string | null {
  if (!parentMessageId) {
    return null;
  }

  const trimmedParentMessageId = parentMessageId.trim();
  return trimmedParentMessageId.length > 0 ? trimmedParentMessageId : null;
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
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export class MessageService {
  async addMessage(params: CreateMessageParams): Promise<ChatMessageOutput | null> {
    const messages = await this.addMessages([params]);
    return messages[0] ?? null;
  }

  async addMessages(params: CreateMessageParams[]): Promise<ChatMessageOutput[]> {
    try {
      if (params.length === 0) {
        return [];
      }

      const chatId = params[0]?.chatId;
      if (!chatId || params.some((message) => message.chatId !== chatId)) {
        throw new ChatError('VALIDATION_ERROR', 'Messages must target the same chat');
      }

      const insertedMessages = await db.transaction().execute(async (trx) => {
        const newMessages = await trx
          .insertInto('chat_message')
          .values(
            params.map((message) => ({
              id: crypto.randomUUID(),
              chat_id: message.chatId,
              user_id: message.userId,
              role: message.role,
              content: message.content,
              files: message.files as Json,
              tool_calls: message.toolCalls as Json,
              reasoning: message.reasoning ?? null,
              parent_message_id: normalizeParentMessageId(message.parentMessageId),
            })),
          )
          .returningAll()
          .execute();

        if (newMessages.length !== params.length) {
          throw new ChatError('DATABASE_ERROR', 'Failed to create all messages');
        }

        await trx
          .updateTable('chat')
          .set({ updated_at: new Date() })
          .where('id', '=', chatId)
          .execute();

        return newMessages;
      });

      return insertedMessages.map(toMessageOutput);
    } catch (error) {
      logger.error(`Failed to add message: ${error}`);
      if (error instanceof ChatError) {
        throw error;
      }
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
      throw new ChatError('DATABASE_ERROR', 'Failed to fetch chat messages');
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
      if (error instanceof ChatError) {
        throw error;
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to fetch message');
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
          updated_at: new Date(),
        })
        .where('id', '=', messageId)
        .returningAll()
        .executeTakeFirst();

      if (!updatedMessage) {
        return null;
      }

      return toMessageOutput(updatedMessage);
    } catch (error) {
      logger.error(`Failed to update message: ${error}`);
      if (error instanceof ChatError) {
        throw error;
      }
      throw new ChatError('DATABASE_ERROR', 'Failed to update message');
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
        .where('created_at', '>', new Date(afterTimestamp))
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
