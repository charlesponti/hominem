import { db } from '@hominem/db/core';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const tagsRoutes = new Hono<AppContext>().get('/list', authMiddleware, async (c) => {
  const userId = c.get('auth')!.userId;
  const tags = await db
    .selectFrom('app.tags')
    .select(['id', 'ownerUserid', 'name', 'color'])
    .where('ownerUserid', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();

  return c.json(
    tags.map((tag) => ({
      id: tag.id,
      userId: tag.ownerUserid,
      name: tag.name,
      color: tag.color ?? null,
    })),
    200,
  );
});
