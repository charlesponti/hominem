import { db } from '@hominem/db';
import { health } from '@hominem/db/schema/health';
import { UnavailableError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const statusRoutes = new Hono<AppEnv>();

// System health check endpoint
statusRoutes.get('/', async (c) => {
  try {
    await db.select().from(health).limit(1);

    return c.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (err) {
    logger.error('Health check failed', { error: err });
    throw new UnavailableError('Health check failed', {
      status: 'error',
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});
