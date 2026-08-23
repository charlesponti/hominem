import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import {
  getAIUsageTimeseries,
  getMonthlyAIUsageReport,
  getMonthlyUsageStatus,
} from '../../application/ai-usage.service';
import { getSpeechUsageHealth } from '../../application/speech-usage.service';
import { ForbiddenError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

const usageTimeseriesSchema = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    granularity: z.enum(['day', 'month']),
  })
  .refine(({ from, to }) => new Date(from).getTime() < new Date(to).getTime(), {
    message: '`from` must be before `to`',
    path: ['to'],
  });

export const usageRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getMonthlyAIUsageReport(userId));
  })
  .get('/timeseries', zValidator('query', usageTimeseriesSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    return c.json(await getAIUsageTimeseries({ userId, ...c.req.valid('query') }));
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
