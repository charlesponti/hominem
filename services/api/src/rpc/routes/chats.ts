import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { ChatsCreateSchema, ChatsListQuerySchema } from '../../schemas/chats.schema';
import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { chatResourceRoutes } from './chats.$chatId';
import { chatGenerationRoutes, chatStartGenerationRoute } from './chats.$chatId.generation';
import { chatMessageRoutes } from './chats.$chatId.message';
import { chatSourceRoutes } from './chats.$chatId.source';
import { toChatDto } from './chats.mapper';

const chatCollectionRoutes = new Hono<AppContext>()
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

const chatByIdRoutes = new Hono<AppContext>()
  .use('/stream', rateLimitMiddleware({ bucket: 'chat-stream', windowSec: 60, max: 30 }))
  .route('/', chatResourceRoutes)
  .route('/', chatMessageRoutes)
  .route('/', chatSourceRoutes)
  .route('/', chatGenerationRoutes);

export const chatsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .route('/', chatCollectionRoutes)
  .route('/start-stream', chatStartGenerationRoute)
  .route('/:id', chatByIdRoutes);
