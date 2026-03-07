import { sql } from '@hominem/db';
import { db } from '@hominem/hono-rpc';
import { UnavailableError } from '@hominem/hono-rpc';
import { logger } from '@hominem/utils/logger';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const statusRoutes = new Hono<AppEnv>();

// System health check endpoint
statusRoutes.get('/', async (c) => {
  try {
    await db.execute(sql`select 1`);

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
