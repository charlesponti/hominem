import { MessageService } from '@hominem/chat-services';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const messageService = new MessageService();

const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty'),
});

const deleteMessagesAfterSchema = z.object({
  chatId: z.string(),
  afterTimestamp: z.string(),
});

export const messagesRoutes = new Hono<AppContext>()
  // Get message by ID
  .get('/:messageId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');

      if (!messageId) {
        return c.json(error('VALIDATION_ERROR', 'Message ID is required'), 400);
      }

      const message = await messageService.getMessageById(messageId, userId);
      return c.json(success({ message }));
    } catch (err) {
      console.error('[messages.getMessageById] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to load message'), 500);
    }
  })

  // Update message
  .patch('/:messageId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');

      if (!messageId) {
        return c.json(error('VALIDATION_ERROR', 'Message ID is required'), 400);
      }

      const body = await c.req.json();
      const parsed = updateMessageSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const { content } = parsed.data;

      // Verify message belongs to user
      const message = await messageService.getMessageById(messageId, userId);
      if (!message) {
        return c.json(error('NOT_FOUND', 'Message not found or not authorized'), 404);
      }

      // Only allow editing user messages
      if (message.role !== 'user') {
        return c.json(error('FORBIDDEN', 'Only user messages can be edited'), 403);
      }

      // Delete all messages created after this message's timestamp
      await messageService.deleteMessagesAfter(message.chatId, message.createdAt, userId);

      // Update the message content
      const updatedMessage = await messageService.updateMessage({ messageId, content });
      return c.json(success({ message: updatedMessage }));
    } catch (err) {
      console.error('[messages.updateMessage] error:', err);
      return c.json(
        error('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update message'),
        500,
      );
    }
  })

  // Delete message
  .delete('/:messageId', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const messageId = c.req.param('messageId');

      if (!messageId) {
        return c.json(error('VALIDATION_ERROR', 'Message ID is required'), 400);
      }

      const deleted = await messageService.deleteMessage(messageId, userId);
      return c.json(success({ success: deleted }));
    } catch (err) {
      console.error('[messages.deleteMessage] error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to delete message'), 500);
    }
  })

  // Delete messages after a timestamp
  .post('/delete-after', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = deleteMessagesAfterSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const { chatId, afterTimestamp } = parsed.data;

      const deletedCount = await messageService.deleteMessagesAfter(chatId, afterTimestamp, userId);
      return c.json(success({ deletedCount }));
    } catch (err) {
      console.error('[messages.deleteMessagesAfter] error:', err);
      return c.json(
        error(
          'INTERNAL_ERROR',
          err instanceof Error ? err.message : 'Failed to delete subsequent messages',
        ),
        500,
      );
    }
  });
