import { getMonthlySummary } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import {
  financeMonthlySummaryQuerySchema,
  financeMonthlySummarySchema,
} from '../../schemas/finance.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { respondWithData } from '../response';

const routes = new Hono<AppContext>();

routes.get(
  '/finance/monthly-summary',
  authMiddleware,
  zValidator('query', financeMonthlySummaryQuerySchema),
  async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const summary = await getMonthlySummary({ ownerUserId: userId, ...input });
    return respondWithData(c, financeMonthlySummarySchema, summary);
  },
);

export const personalRoutes: Hono<AppContext> = routes;
