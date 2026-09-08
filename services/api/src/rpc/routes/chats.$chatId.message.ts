import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';
import { chatFileCleanupQueue } from '@hominem/queues';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  ChatSpeechMessageNotFoundError,
  ChatSpeechUnavailableError,
  streamMessageSpeech,
} from '../../chat/chat-speech.service';
import {
  ChatsEditMessageSchema,
  ChatsMessagesQuerySchema,
  ChatsSearchMessagesQuerySchema,
} from '../../schemas/chats.schema';
import { NotFoundError, UnavailableError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
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
    // updateMessage scopes its own lookup by authorUserid and throws
    // NotFoundError itself, so no separate ownership round trip is needed.
    const result = await runInTransaction((trx) =>
      ChatRepository.updateMessage(trx, chatId, messageId, userId, content),
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
    return c.json({
      ...toChatMessageDto(result.message),
      deletedMessageIds: result.deletedMessageIds,
    });
  })
  .delete('/messages/:messageId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);
    // deleteUserMessageAndFollowing scopes its own lookup by authorUserid
    // and throws NotFoundError itself, so no separate ownership round trip
    // is needed.
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
  })
  .use(
    '/messages/:messageId/speech',
    rateLimitMiddleware({ bucket: 'chat-speech', windowSec: 60, max: 20 }),
  )
  .get('/messages/:messageId/speech', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const messageId = getMessageId(c);

    let result;
    try {
      result = await streamMessageSpeech({
        chatId,
        messageId,
        ownerUserId: userId,
      });
    } catch (error) {
      if (error instanceof ChatSpeechMessageNotFoundError) {
        throw new NotFoundError(error.message);
      }
      if (error instanceof ChatSpeechUnavailableError) {
        throw new UnavailableError(error.message);
      }
      throw error;
    }

    return new Response(result.stream, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': result.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Server-Timing': `speech-provider;dur=${result.providerReadyDurationMs}`,
      },
    });
  });
