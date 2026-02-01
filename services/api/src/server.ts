import type { HominemUser } from '@hominem/auth/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { app as honoRpcApp } from '@hominem/hono-rpc';
import { redis } from '@hominem/services/redis';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { Queue } from 'bullmq';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { env } from './env';
import { supabaseMiddleware } from './middleware/supabase';
import { aiRoutes } from './routes/ai';
import { componentsRoutes } from './routes/components';
import { financeRoutes } from './routes/finance';
import { plaidRoutes } from './routes/finance/plaid';
import { healthRoutes } from './routes/health';
import { imagesRoutes } from './routes/images';
import { invitesRoutes } from './routes/invites';
import { oauthRoutes } from './routes/oauth';
import { possessionsRoutes } from './routes/possessions';
import { statusRoutes } from './routes/status';

export type AppEnv = {
  Variables: {
    userId?: string;
    user?: HominemUser;
    supabaseId?: string;
    supabase?: SupabaseClient;
    queues: {
      plaidSync: Queue;
      importTransactions: Queue;
      placePhotoEnrich: Queue;
    };
  };
};

export function createServer() {
  const app = new Hono<AppEnv>();

  // Set up BullMQ queues using consistent queue names.
  const plaidSyncQueue = new Queue(QUEUE_NAMES.PLAID_SYNC, {
    connection: redis as any,
  });
  const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
    connection: redis as any,
  });

  const placePhotoEnrichQueue = new Queue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
    connection: redis as any,
  });

  // Add queues to the app context
  app.use('*', async (c, next) => {
    c.set('queues', {
      plaidSync: plaidSyncQueue,
      importTransactions: importTransactionsQueue,
      placePhotoEnrich: placePhotoEnrichQueue,
    });
    await next();
  });

  // Logger middleware
  app.use('*', logger());

  // Pretty JSON middleware
  app.use('*', prettyJSON());

  // CORS middleware
  app.use(
    '*',
    cors({
      origin: [env.API_URL, env.ROCCO_URL, env.NOTES_URL, env.FLORIN_URL],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );

  // Authentication middleware
  app.use('*', supabaseMiddleware());

  // tRPC routes deprecated - using Hono RPC instead

  // Register Hono RPC routes
  // Note: honoRpcApp already includes /api prefix in its routes (e.g., /api/finance, /api/lists)
  app.route('/', honoRpcApp);

  // Register other route handlers
  app.route('/api/status', statusRoutes);
  app.route('/api/health', healthRoutes);
  app.route('/api/ai', aiRoutes);
  app.route('/api/oauth', oauthRoutes);
  app.route('/api/possessions', possessionsRoutes);
  app.route('/api/invites', invitesRoutes);
  app.route('/api/images', imagesRoutes);
  app.route('/components', componentsRoutes);
  app.route('/api/finance', financeRoutes);
  app.route('/api/finance/plaid', plaidRoutes);

  // Root health check
  app.get('/', (c) => {
    return c.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  return app;
}

export async function startServer() {
  const app = createServer();
  if (!app) {
    console.error('Failed to create server');
    process.exit(1);
  }

  try {
    const { serve } = await import('@hono/node-server');
    const port = Number.parseInt(env.PORT, 10);

    serve({
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0',
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
