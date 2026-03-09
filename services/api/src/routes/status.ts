import { db } from '@hominem/db';
import { UnavailableError } from '@hominem/hono-rpc';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const statusRoutes = new Hono<AppEnv>();

// System health check endpoint
statusRoutes.get('/', async (c) => {
  try {
    // Simple health check using selectFrom
    await db.selectFrom('users').select('id').limit(1).executeTakeFirst();

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
