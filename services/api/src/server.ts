import type { User } from '@hominem/auth/server';
import { createHonoTelemetryMiddleware } from '@hominem/telemetry/node';
import { logger } from '@hominem/utils/logger';
import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { betterAuthServer } from './auth/better-auth';
import { getJwks } from './auth/key-store';
import type { AuthContextEnvelope } from './auth/types';
import { API_BRAND } from './brand';
import { env } from './env';
import { authJwtMiddleware } from './middleware/auth';
import { blockMaliciousProbes } from './middleware/block-probes';
import { requestLogger } from './middleware/request-logger';
import { isServiceError } from './errors';
import { rpcApp } from './rpc/app';
import { aiRoutes } from './routes/ai';
import { authRoutes } from './routes/auth';
import { componentsRoutes } from './routes/components';
import { financeRoutes } from './routes/finance';
import { plaidRoutes } from './routes/finance/plaid';
import { healthRoutes } from './routes/health';
import { imagesRoutes } from './routes/images';
import { invitesRoutes } from './routes/invites';
import { oauthRoutes } from './routes/oauth';
import { statusRoutes } from './routes/status';

export type AppEnv = {
  Variables: {
    userId?: string;
    user?: User;
    auth?: AuthContextEnvelope;
  };
};

export function createServer() {
  const app = new Hono<AppEnv>();

  // Block malicious probe requests before doing anything else.
  // Placing this ahead of the logger keeps the noise out of our logs and
  // prevents the request from traversing any further middleware.
  app.use('*', blockMaliciousProbes());

  // OpenTelemetry telemetry middleware
  app.use('*', createHonoTelemetryMiddleware());

  app.use('*', requestLogger());

  // Pretty JSON middleware
  app.use('*', prettyJSON());

  // CORS middleware
  app.use(
    '*',
    cors({
      origin: (origin) => {
        const allowedOrigins = [env.API_URL, env.NOTES_URL];
        return allowedOrigins.includes(origin || '') ? origin : null;
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );

  // Authentication middleware
  app.use('*', authJwtMiddleware());

  // RPC routes deprecated - using Hono RPC instead

  // Register Hono RPC routes
  // Note: honoRpcApp already includes /api prefix in its routes (e.g., /api/finance, /api/lists)
  app.route('/', rpcApp);

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

  // OpenAPI 3.1 specification endpoint with security schemes
  app.get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: {
        openapi: '3.1.0',
        info: {
          title: API_BRAND.api.title,
          version: '1.0.0',
          description: API_BRAND.api.description,
          contact: {
            name: API_BRAND.api.contactName,
            email: 'code@hominem.io',
          },
        },
        servers: [
          {
            url: env.API_URL,
            description: 'Production API server',
          },
          {
            url: 'http://localhost:4040',
            description: 'Local development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token for authentication',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    }),
  );

  // Scalar API documentation UI
  app.get(
    '/docs',
    apiReference({
      theme: 'saturn',
      url: '/openapi.json',
      metaData: {
        title: API_BRAND.api.docsTitle,
      },
      layout: 'classic',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
    }),
  );

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

  // 404 handler for unsupported routes
  app.notFound((c) => {
    return c.text('玉をなめろ', 404);
  });

  return app;
}
