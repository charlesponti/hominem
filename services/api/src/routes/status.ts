import { db } from '@hominem/db';
import { health } from '@hominem/db/schema';
import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const statusRoutes = new Hono<AppEnv>();

// System health check endpoint
statusRoutes.get('/', async (c) => {
  try {
    await db.select().from(health).limit(1);

    return c.json(
      success({
        status: 'ok',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
      }),
      200,
    );
  } catch (err) {
    console.error('Health check failed:', err);
    return c.json(
      error('UNAVAILABLE', 'Health check failed', {
        status: 'error',
        serverTime: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        message: err instanceof Error ? err.message : 'Unknown error',
      }),
      500,
    );
  }
});
