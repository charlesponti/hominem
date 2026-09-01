import { ChatRepository, db } from '@hominem/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  ChatsCreateSchema,
  ChatsListQuerySchema,
  ChatsUpdateSchema,
} from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';
import { toChatDto, toChatMessageDto } from './chats.mapper';
import { getChatId } from './chats.route-helpers';

export const chatCollectionRoutes = new Hono<AppContext>()
  .get('/', zValidator('query', ChatsListQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { cursor, includeArchived, limit } = c.req.valid('query');
    const page = await ChatRepository.listForUser(db, userId, {
      cursor,
      includeArchived: includeArchived === 'true',
      limit,
    });
    return c.json({ items: page.chats.map(toChatDto), nextCursor: page.nextCursor });
  })
  .post('/', zValidator('json', ChatsCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const { title } = c.req.valid('json');
    const chat = await ChatRepository.create(db, { userId, title });
    return c.json(toChatDto(chat), 201);
  });

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
