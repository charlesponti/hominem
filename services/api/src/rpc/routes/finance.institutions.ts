import { randomUUID } from 'crypto';

import { db } from '@hominem/db';
import type {
  InstitutionCreateOutput,
  InstitutionsListOutput,
} from '@hominem/rpc/types/finance/institutions.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

const emptyBodySchema = z.object({});

const createInstitutionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  logo: z.string().optional(),
  url: z.string().optional(),
  primaryColor: z.string().optional(),
  country: z.string().optional(),
});

export const institutionsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', emptyBodySchema), async (c) => {
    const institutions = await db
      .selectFrom('financial_institutions')
      .select(['id', 'name'])
      .orderBy('name', 'asc')
      .execute();

    return c.json<InstitutionsListOutput>(
      institutions.map((item) => ({ id: item.id, name: item.name })),
      200,
    );
  })
  .post('/create', authMiddleware, zValidator('json', createInstitutionSchema), async (c) => {
    const input = c.req.valid('json');
    const id = input.id ?? randomUUID();

    await db.insertInto('financial_institutions').values({ id, name: input.name }).execute();

    const created = await db
      .selectFrom('financial_institutions')
      .select(['id', 'name'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!created) throw new Error('Failed to create institution');

    return c.json<InstitutionCreateOutput>({ id: created.id, name: created.name }, 201);
  });
