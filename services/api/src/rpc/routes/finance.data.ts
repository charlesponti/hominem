import { deleteUserFinanceData } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

const deleteAllSchema = z.object({
  confirm: z.literal(true),
});

export const dataRoutes = new Hono<AppContext>().post(
  '/delete-all',
  authMiddleware,
  zValidator('json', deleteAllSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const summary = await deleteUserFinanceData(userId);
    return c.json({
      success: true,
      ...summary,
    });
  },
);
