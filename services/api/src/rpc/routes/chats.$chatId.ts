import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { ChatsUpdateSchema } from '../../schemas/chats.schema';
import { NotFoundError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { toChatDto, toChatMessageDto } from './chats.mapper';
import { getChatId } from './chats.route-helpers';

export const chatResourceRoutes = new Hono<AppContext>()
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    // getOwnedWithMessages combines the ownership check and the messages
    // fetch into one query; null means the chat doesn't exist or isn't
    // owned.
    const result = await ChatRepository.getOwnedWithMessages(db, chatId, userId, 100, 0);
    if (!result) throw new NotFoundError('Chat', { chatId });
    return c.json({
      ...toChatDto(result.chat),
      messages: result.messages.map(toChatMessageDto),
    });
  })
  .patch('/', zValidator('json', ChatsUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { title } = c.req.valid('json');
    // updateTitle is ownership-scoped and throws NotFoundError itself.
    await ChatRepository.updateTitle(db, chatId, userId, title);
    return c.json({ success: true });
  })
  .post('/archive', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    // archive is ownership-scoped and throws NotFoundError itself.
    const archived = await ChatRepository.archive(db, chatId, userId);
    return c.json(toChatDto(archived));
  });
