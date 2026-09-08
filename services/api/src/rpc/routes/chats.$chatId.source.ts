import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { ChatsAddSourceSchema } from '../../schemas/chats.schema';
import { NotFoundError } from '../errors';
import type { AppContext } from '../middleware/auth';
import { toChatSourceDto } from './chats.mapper';
import { getChatId } from './chats.route-helpers';

export const chatSourceRoutes = new Hono<AppContext>()
  .get('/sources', async (c) => {
    const userId = c.get('auth')!.userId;
    const chatId = getChatId(c);
    // listChatSourcesForOwner combines the ownership check and the fetch
    // into one query; null means the chat doesn't exist or isn't owned.
    const sources = await ChatRepository.listChatSourcesForOwner(db, chatId, userId);
    if (!sources) throw new NotFoundError('Chat', { chatId });
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
