import { Hono } from 'hono';

import { getMonthlyAIUsageReport, getMonthlyUsageStatus } from '../../application/ai-usage.service';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const usageRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getMonthlyAIUsageReport(userId));
  })
  .get('/monthly', async (c) => {
    const userId = c.get('auth')!.userId;
    const status = await getMonthlyUsageStatus(userId);
    return c.json(status);
  });
