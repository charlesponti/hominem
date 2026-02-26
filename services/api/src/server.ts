import type { HominemUser } from '@hominem/auth/server';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { app as honoRpcApp } from '@hominem/hono-rpc';
import { isServiceError } from '@hominem/services';
import { redis } from '@hominem/services/redis';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';
import { Queue } from 'bullmq';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import type { AuthContextEnvelope } from './auth/types';

import { betterAuthServer } from './auth/better-auth';
import { getJwks } from './auth/key-store';
import { env } from './env';
import { initSentry, sentryMiddleware } from './lib/sentry';
import { authJwtMiddleware } from './middleware/auth';
import { aiRoutes } from './routes/ai';
import { authRoutes } from './routes/auth';
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
    auth?: AuthContextEnvelope;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redis as any,
  });
  const importTransactionsQueue = new Queue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection: redis as any,
  });

  const placePhotoEnrichQueue = new Queue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  app.use('*', honoLogger());

  // Pretty JSON middleware
  app.use('*', prettyJSON());

  // CORS middleware
  app.use(
    '*',
    cors({
      origin: [env.API_URL, env.ROCCO_URL, env.NOTES_URL, env.FINANCE_URL],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );

  // Authentication middleware
  app.use('*', authJwtMiddleware());

  // Sentry request tracking
  app.use('*', sentryMiddleware());

  // RPC routes deprecated - using Hono RPC instead

  // Register Hono RPC routes
  // Note: honoRpcApp already includes /api prefix in its routes (e.g., /api/finance, /api/lists)
  app.route('/', honoRpcApp);

  // Better Auth bootstrap surface during migration.
  app.on(['GET', 'POST'], '/api/better-auth/*', (c) => {
    return betterAuthServer.handler(c.req.raw);
  });

  app.get('/.well-known/jwks.json', async (c) => {
    return c.json(await getJwks());
  });

  // Register other route handlers
  app.route('/api/status', statusRoutes);
  app.route('/api/health', healthRoutes);
  app.route('/api/auth', authRoutes);
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

  // Global error handler - must be after routes
  app.onError((err, c) => {
    logger.error('[services/api] Error', { error: err });

    if (isServiceError(err)) {
      return c.json(
        {
          error: err.code.toLowerCase(),
          message: err.message,
        },
        err.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      {
        error: 'internal_error',
        message: 'An unexpected error occurred',
      },
      500,
    );
  });

  return app;
}

export async function startServer() {
  // Initialize Sentry first
  initSentry();

  const app = createServer();
  if (!app) {
    logger.error('Failed to create server');
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
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}
