import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { ChatsUpdateSchema } from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';
import { toChatDto, toChatMessageDto } from './chats.mapper';
import { getChatId } from './chats.route-helpers';

export const chatResourceRoutes = new Hono<AppContext>()
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const [chat, messages] = await Promise.all([
      ChatRepository.getOwnedOrThrow(db, chatId, userId),
      ChatRepository.getMessages(db, chatId, 100, 0),
    ]);
    return c.json({ ...toChatDto(chat), messages: messages.map(toChatMessageDto) });
  })
  .patch('/', zValidator('json', ChatsUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { title } = c.req.valid('json');
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    await ChatRepository.updateTitle(db, chatId, userId, title);
    return c.json({ success: true });
  })
  .post('/archive', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const archived = await ChatRepository.archive(db, chatId, userId);
    return c.json(toChatDto(archived));
  });
