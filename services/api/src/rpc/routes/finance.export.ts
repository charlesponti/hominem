import { exportFinanceData } from '@hominem/finance-services';
import { Hono } from 'hono';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

export const exportRoutes = new Hono<AppContext>().post('/all', authMiddleware, async (c) => {
  const userId = c.get('userId')!;
  const data = await exportFinanceData(userId);
  return c.json(data);
});
