import { getAllInstitutions, createInstitution } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { type InstitutionsListOutput, type InstitutionCreateOutput } from '../types/finance.types';

/**
 * Finance Institutions Routes
 */
export const institutionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - ListOutput institutions
  .post('/list', async (c) => {
    const result = await getAllInstitutions();
    return c.json<InstitutionsListOutput>(result, 200);
  })

  // POST /create - Create institution
  .post(
    '/create',
    zValidator(
      'json',
      z.object({
        id: z.string(),
        name: z.string().min(1),
        url: z.string().url().optional(),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
        country: z.string().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');

      const result = await createInstitution({
        id: input.id,
        name: input.name,
        url: input.url ?? null,
        logo: input.logo ?? null,
        primaryColor: input.primaryColor ?? null,
        country: input.country ?? null,
      });
      return c.json<InstitutionCreateOutput>(result, 201);
    },
  );
