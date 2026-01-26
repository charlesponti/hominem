import { MessageService } from '@hominem/chat-services';
import { error, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import type {
  ChatMessage,
  MessagesGetOutput,
  MessagesUpdateOutput,
  MessagesDeleteOutput,
  MessagesDeleteAfterOutput,
} from '../types/chat.types';

const messageService = new MessageService();

/**
 * Serialization Helpers
 */
function serializeChatMessage(m: any): ChatMessage {
  return {
    id: m.id,
    chatId: m.chatId,
    userId: m.userId,
    role: m.role,
    content: m.content,
    files: m.files,
    toolCalls: m.toolCalls,
    reasoning: m.reasoning,
    parentMessageId: m.parentMessageId,
    messageIndex: m.messageIndex,
    createdAt: typeof m.createdAt === 'string' ? m.createdAt : m.createdAt.toISOString(),
    updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : m.updatedAt.toISOString(),
  };
}

const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

const deleteMessagesAfterSchema = z.object({
  chatId: z.string(),
  afterTimestamp: z.string(),
});

export const messagesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // Get message by ID
  .get('/:messageId', async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');

      const message = await messageService.getMessageById(messageId, userId);
      if (!message) {
        return c.json<MessagesGetOutput>(error('NOT_FOUND', 'Message not found'), 404);
      }
      return c.json<MessagesGetOutput>(success({ message: serializeChatMessage(message) }));
    } catch (err) {
      console.error('[messages.getMessageById] error:', err);
      return c.json<MessagesGetOutput>(error('INTERNAL_ERROR', 'Failed to load message'), 500);
    }
  })

  // Update message
  .patch('/:messageId', zValidator('json', updateMessageSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');
      const { content } = c.req.valid('json');

      const message = await messageService.getMessageById(messageId, userId);
      if (!message) {
        return c.json<MessagesUpdateOutput>(error('NOT_FOUND', 'Message not found or not authorized'), 404);
      }

      if (message.role !== 'user') {
        return c.json<MessagesUpdateOutput>(error('FORBIDDEN', 'Only user messages can be edited'), 403);
      }

      await messageService.deleteMessagesAfter(message.chatId, message.createdAt, userId);

      const updatedMessage = await messageService.updateMessage({ messageId, content });
      return c.json<MessagesUpdateOutput>(success({ message: serializeChatMessage(updatedMessage) }));
    } catch (err) {
      console.error('[messages.updateMessage] error:', err);
      return c.json<MessagesUpdateOutput>(
        error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update message'),
        500,
      );
    }
  })

  // Delete message
  .delete('/:messageId', async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');

      const deleted = await messageService.deleteMessage(messageId, userId);
      return c.json<MessagesDeleteOutput>(success({ success: deleted }));
    } catch (err) {
      console.error('[messages.deleteMessage] error:', err);
      return c.json<MessagesDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete message'), 500);
    }
  })

  // Delete messages after a timestamp
  .post('/delete-after', zValidator('json', deleteMessagesAfterSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const { chatId, afterTimestamp } = c.req.valid('json');

      const deletedCount = await messageService.deleteMessagesAfter(chatId, afterTimestamp, userId);
      return c.json<MessagesDeleteAfterOutput>(success({ deletedCount }));
    } catch (err) {
      console.error('[messages.deleteMessagesAfter] error:', err);
      return c.json<MessagesDeleteAfterOutput>(
        error(
          'INTERNAL_ERROR',
          err instanceof Error ? err.message : 'Failed to delete subsequent messages',
        ),
        500,
      );
    }
  });
