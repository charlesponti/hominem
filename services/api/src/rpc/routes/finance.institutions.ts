import { randomUUID } from 'crypto';

import { db } from '@hominem/db/core';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

const createInstitutionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  logo: z.string().optional(),
  url: z.string().optional(),
  primaryColor: z.string().optional(),
  country: z.string().optional(),
});

export const institutionsRoutes = new Hono<AppContext>()
  .get('/list', authMiddleware, async (c) => {
    const institutions = await db
      .selectFrom('app.financeInstitutions')
      .select(['id', 'name'])
      .orderBy('name', 'asc')
      .execute();

    return c.json(
      institutions.map((item) => ({ id: item.id, name: item.name })),
      200,
    );
  })
  .post('/create', authMiddleware, zValidator('json', createInstitutionSchema), async (c) => {
    const input = c.req.valid('json');
    const id = input.id ?? randomUUID();

    await db.insertInto('app.financeInstitutions').values({ id, name: input.name }).execute();

    const created = await db
      .selectFrom('app.financeInstitutions')
      .select(['id', 'name'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!created) throw new Error('Failed to create institution');

    return c.json({ id: created.id, name: created.name }, 201);
  });
