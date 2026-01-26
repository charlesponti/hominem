import { getAllInstitutions, createInstitution } from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { type InstitutionsListOutput, type InstitutionCreateOutput } from '../types/finance.types';

/**
 * Finance Institutions Routes
 */
export const institutionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List institutions
  .post('/list', async (c) => {
    try {
      const result = await getAllInstitutions();
      return c.json<InstitutionsListOutput>(success(result as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<InstitutionsListOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error listing institutions:', err);
      return c.json<InstitutionsListOutput>(error('INTERNAL_ERROR', 'Failed to list institutions'), 500);
    }
  })

  // POST /create - Create institution
  .post('/create', zValidator('json', z.object({
    id: z.string(),
    name: z.string().min(1),
    url: z.string().url().optional(),
    logo: z.string().optional(),
    primaryColor: z.string().optional(),
    country: z.string().optional(),
  })), async (c) => {
    const input = c.req.valid('json') as any;

    try {
      const result = await createInstitution(input);
      return c.json<InstitutionCreateOutput>(success(result as any), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<InstitutionCreateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error creating institution:', err);
      return c.json<InstitutionCreateOutput>(error('INTERNAL_ERROR', 'Failed to create institution'), 500);
    }
  });
