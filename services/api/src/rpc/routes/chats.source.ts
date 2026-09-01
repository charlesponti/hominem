import { ChatRepository, db } from '@hominem/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { ChatsAddSourceSchema } from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';
import { toChatSourceDto } from './chats.mapper';
import { getChatId } from './chats.route-helpers';

export const chatSourceRoutes = new Hono<AppContext>()
  .get('/sources', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const sources = await ChatRepository.listChatSources(db, chatId);
    return c.json(sources.map(toChatSourceDto));
  })
  .post('/sources', zValidator('json', ChatsAddSourceSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const { noteId } = c.req.valid('json');
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const source = await ChatRepository.addChatSource(db, chatId, noteId, userId);
    return c.json(toChatSourceDto(source), 201);
  })
  .delete('/sources/:noteId', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    const noteId = c.req.param('noteId');
    await ChatRepository.getOwnedOrThrow(db, chatId, userId);
    const removed = await ChatRepository.removeChatSource(db, chatId, noteId);
    return c.json({ removed });
  });
