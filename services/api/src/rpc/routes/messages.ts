import { db, NotFoundError, ForbiddenError, InternalError } from '@hominem/db';
import type { Database } from '@hominem/db';
import type {
  MessagesGetOutput,
  MessagesUpdateOutput,
  MessagesDeleteOutput,
  MessagesDeleteAfterOutput,
  ChatMessage,
} from '@hominem/rpc/types/chat.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Selectable } from 'kysely';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { toIsoStringOr } from '../utils/to-iso-string';

function toChatMessage(row: Selectable<Database['chat_message']>): ChatMessage {
  const now = new Date().toISOString();
  const createdAtStr = toIsoStringOr(row.created_at, now);
  const updatedAtStr = toIsoStringOr(row.updated_at, now);

  return {
    id: row.id,
    chatId: row.chat_id,
    userId: row.user_id,
    content: row.content,
    role: row.role as ChatMessage['role'],
    files: row.files ? (JSON.parse(String(row.files)) as ChatMessage['files']) : null,
    toolCalls: row.tool_calls
      ? (JSON.parse(String(row.tool_calls)) as ChatMessage['toolCalls'])
      : null,
    reasoning: row.reasoning,
    parentMessageId: row.parent_message_id,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

const deleteMessagesAfterSchema = z.object({
  chatId: z.string(),
  afterTimestamp: z.string(),
});

// Helper: Get message by ID with ownership check (via chat)
async function getMessageWithOwnershipCheck(messageId: string, userId: string) {
  const message = await db
    .selectFrom('chat_message')
    .selectAll()
    .where('id', '=', messageId)
    .executeTakeFirst();

  if (!message) {
    throw new NotFoundError('Message not found');
  }

  // Verify ownership via the chat
  const chat = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', message.chat_id)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!chat) {
    throw new ForbiddenError('Message not found or access denied', 'ownership');
  }

  return message;
}

// Helper: Delete messages after timestamp
async function deleteMessagesAfterTimestamp(
  chatId: string,
  afterTimestamp: Date | string,
  userId: string,
) {
  const afterDate = afterTimestamp instanceof Date ? afterTimestamp : new Date(afterTimestamp);

  // Verify chat ownership
  const chat = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .executeTakeFirst();

  if (!chat) {
    throw new ForbiddenError('Chat not found or access denied', 'ownership');
  }

  // Delete messages after the timestamp
  const result = await db
    .deleteFrom('chat_message')
    .where('chat_id', '=', chatId)
    .where('created_at', '>', afterDate)
    .execute();

  return result.length;
}

export const messagesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get message by ID
  .get('/:messageId', async (c) => {
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');

    const message = await getMessageWithOwnershipCheck(messageId, userId);
    return c.json<MessagesGetOutput>({
      message: toChatMessage(message),
    });
  })

  // Update message
  .patch('/:messageId', zValidator('json', updateMessageSchema), async (c) => {
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');
    const { content } = c.req.valid('json');

    const message = await getMessageWithOwnershipCheck(messageId, userId);

    if (message.role !== 'user') {
      throw new ForbiddenError('Only user messages can be edited');
    }

    // Delete messages after this one
    await deleteMessagesAfterTimestamp(message.chat_id, message.created_at, userId);

    const updatedMessage = await db
      .updateTable('chat_message')
      .set({
        content,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', messageId)
      .returningAll()
      .executeTakeFirst();

    if (!updatedMessage) {
      throw new InternalError('Failed to update message');
    }
    return c.json<MessagesUpdateOutput>({
      message: toChatMessage(updatedMessage),
    });
  })

  // Delete message
  .delete('/:messageId', async (c) => {
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');

    await getMessageWithOwnershipCheck(messageId, userId);

    const result = await db.deleteFrom('chat_message').where('id', '=', messageId).execute();

    return c.json<MessagesDeleteOutput>({ success: result.length > 0 });
  })

  // Delete messages after a timestamp
  .post('/delete-after', zValidator('json', deleteMessagesAfterSchema), async (c) => {
    const userId = c.get('userId')!;
    const { chatId, afterTimestamp } = c.req.valid('json');

    const deletedCount = await deleteMessagesAfterTimestamp(chatId, afterTimestamp, userId);
    return c.json<MessagesDeleteAfterOutput>({ deletedCount });
  });
