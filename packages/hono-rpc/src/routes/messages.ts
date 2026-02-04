import { MessageService } from '@hominem/chat-services';
import { NotFoundError, ValidationError, ForbiddenError, InternalError } from '@hominem/services';
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
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');

    const message = await messageService.getMessageById(messageId, userId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    return c.json<MessagesGetOutput>({ message: serializeChatMessage(message) });
  })

  // Update message
  .patch('/:messageId', zValidator('json', updateMessageSchema), async (c) => {
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');
    const { content } = c.req.valid('json');

    const message = await messageService.getMessageById(messageId, userId);
    if (!message) {
      throw new NotFoundError('Message not found or not authorized');
    }

    if (message.role !== 'user') {
      throw new ForbiddenError('Only user messages can be edited');
    }

    await messageService.deleteMessagesAfter(message.chatId, message.createdAt, userId);

    const updatedMessage = await messageService.updateMessage({ messageId, content });
    return c.json<MessagesUpdateOutput>({ message: serializeChatMessage(updatedMessage) });
  })

  // Delete message
  .delete('/:messageId', async (c) => {
    const userId = c.get('userId')!;
    const messageId = c.req.param('messageId');

    const deleted = await messageService.deleteMessage(messageId, userId);
    return c.json<MessagesDeleteOutput>({ success: deleted });
  })

  // Delete messages after a timestamp
  .post('/delete-after', zValidator('json', deleteMessagesAfterSchema), async (c) => {
    const userId = c.get('userId')!;
    const { chatId, afterTimestamp } = c.req.valid('json');

    const deletedCount = await messageService.deleteMessagesAfter(chatId, afterTimestamp, userId);
    return c.json<MessagesDeleteAfterOutput>({ deletedCount });
  });
