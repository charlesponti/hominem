import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { recordBrowserSpeechTelemetry } from '../../application/telemetry.service';
import { browserSpeechTelemetrySchema } from '../../schemas/telemetry.schema';
import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';

export const telemetryRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .use('*', rateLimitMiddleware({ bucket: 'telemetry-events', windowSec: 60, max: 60 }))
  .post('/events', zValidator('json', browserSpeechTelemetrySchema), async (c) => {
    recordBrowserSpeechTelemetry(c.req.valid('json'));
    return c.body(null, 204);
  });
