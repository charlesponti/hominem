import { Hono } from 'hono';

import { getMonthlyAIUsageReport, getMonthlyUsageStatus } from '../../application/ai-usage.service';
import { getSpeechUsageHealth } from '../../application/speech-usage.service';
import { ForbiddenError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

export const usageRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getMonthlyAIUsageReport(userId));
  })
  .get('/health', async (c) => {
    if (!c.get('auth')!.user.isAdmin) {
      throw new ForbiddenError('Administrative access required');
    }
    return c.json(await getSpeechUsageHealth());
  })
  .get('/monthly', async (c) => {
    const userId = c.get('auth')!.userId;
    const status = await getMonthlyUsageStatus(userId);
    return c.json(status);
  });
