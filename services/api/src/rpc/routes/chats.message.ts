import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';
import { chatFileCleanupQueue } from '@hominem/queues';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  ChatsEditMessageSchema,
  ChatsMessagesQuerySchema,
  ChatsSearchMessagesQuerySchema,
} from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';
import { toChatMessageDto } from './chats.mapper';
import { getChatId, getMessageId } from './chats.route-helpers';

export const chatMessageRoutes = new Hono<AppContext>()
  .get('/messages', zValidator('query', ChatsMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const query = c.req.valid('query');
    const limit = query.limit ? Number.parseInt(query.limit, 10) : 100;
    const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;
    const messages = await ChatRepository.getMessages(db, chatId, limit, offset);
    return c.json(messages.map(toChatMessageDto));
  })
  .get('/messages/search', zValidator('query', ChatsSearchMessagesQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const { query, limit } = c.req.valid('query');
    const messages = await ChatRepository.searchMessages(db, chatId, query, limit);
    return c.json(messages.map(toChatMessageDto));
  })
  .patch('/messages/:messageId', zValidator('json', ChatsEditMessageSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);
    const { content } = c.req.valid('json');
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const updated = await ChatRepository.updateMessageContent(
      db,
      chatId,
      messageId,
      userId,
      content,
    );
    return c.json(toChatMessageDto(updated));
  })
  .delete('/messages/:messageId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const result = await runInTransaction((trx) =>
      ChatRepository.deleteUserMessageAndFollowing(trx, chatId, messageId, userId),
    );
    if (result.cleanupFileIds.length > 0) {
      await chatFileCleanupQueue.add(
        'delete-chat-files',
        { userId, fileIds: result.cleanupFileIds },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1_000 },
          jobId: `chat-file-cleanup:${chatId}:${messageId}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }
    return c.json({ deletedMessageIds: result.deletedMessageIds });
  });
