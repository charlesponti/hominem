import { LOG_MESSAGES, logger } from '@hominem/telemetry';
import { Scalar } from '@scalar/hono-api-reference';
import * as Sentry from '@sentry/node';
import { Hono, type MiddlewareHandler } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { betterAuthServer } from './auth/better-auth';
import type { AuthContext } from './auth/types';
import { API_BRAND } from './brand';
import { env } from './env';
import { isServiceError } from './errors';
import { oauthDiscoveryRoutes } from './mcp/routes';
import { authMiddleware } from './middleware/auth';
import { authRateLimitMiddleware } from './middleware/auth-rate-limit';
import { blockMaliciousProbes } from './middleware/block-probes';
import { requestLogger } from './middleware/request-logger';
import { authRoutes } from './routes/auth';
import { imagesRoutes } from './routes/images';
import { loginRoutes } from './routes/login';
import { statusRoutes } from './routes/status';
import { rpcApp } from './rpc/app';

export type AppEnv = {
  Variables: {
    auth?: AuthContext;
  };
};

const ALLOWED_CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const DEV_OPENAPI_SERVER = {
  url: 'http://localhost:4040',
  description: 'Local development server',
};
const BEARER_SECURITY_SCHEME = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'session',
  description: 'Better Auth session (cookie or bearer plugin token)',
} as const;

function createAllowedOrigins() {
  return new Set([env.API_URL, env.WEB_URL, env.FINANCE_URL, env.CAREER_URL]);
}

function createCorsMiddleware(): MiddlewareHandler {
  const allowedOrigins = createAllowedOrigins();

  return cors({
    origin: (origin) => (allowedOrigins.has(origin || '') ? origin : null),
    credentials: true,
    allowMethods: ALLOWED_CORS_METHODS,
  });
}

function createAuthHandler() {
  return (c: { req: { raw: Request } }) => betterAuthServer.handler(c.req.raw);
}

function createRootStatusPayload() {
  return {
    status: 'ok',
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

function createOpenApiDocumentation() {
  return {
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
      ...(env.NODE_ENV !== 'production' ? [DEV_OPENAPI_SERVER] : []),
    ],
    components: {
      securitySchemes: {
        bearerAuth: BEARER_SECURITY_SCHEME,
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  };
}

function registerBaseMiddleware(app: Hono<AppEnv>) {
  app.use('*', blockMaliciousProbes());
  app.use('*', requestLogger());
  app.use('*', prettyJSON());
  app.use('*', createCorsMiddleware());
  app.use('*', authMiddleware());
}

function registerApiRoutes(app: Hono<AppEnv>) {
  const authHandler = createAuthHandler();

  app.route('/', rpcApp);
  // OAuth discovery for MCP clients — must be at root per RFC 8414 / RFC 9728
  app.route('/', oauthDiscoveryRoutes);
  app.route('/', loginRoutes);
  // Custom auth extras first (session/logout reshape for apps/finance, e2e helpers).
  // Unmatched /api/auth/* falls through to the Better Auth catch-all handler.
  app.route('/api/auth', authRoutes);
  app.use('/api/auth/*', authRateLimitMiddleware());
  app.route('/api/status', statusRoutes);
  app.on(['GET', 'POST'], '/api/auth', authHandler);
  app.on(['GET', 'POST'], '/api/auth/*', authHandler);
  app.route('/api/images', imagesRoutes);
}

function registerDocumentationRoutes(app: Hono<AppEnv>) {
  app.get(
    '/openapi.json',
    openAPIRouteHandler(app, {
      documentation: createOpenApiDocumentation(),
    }),
  );

  app.get(
    '/docs',
    Scalar({
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
}

function registerErrorHandlers(app: Hono<AppEnv>) {
  app.onError((err, c) => {
    if (env.SENTRY_DSN && env.NODE_ENV !== 'development') {
      Sentry.captureException(err);
    }
    logger.error('[services/api] Error', { error: err });

    if (isServiceError(err)) {
      return c.json(
        {
          error: err.code.toLowerCase(),
          code: err.code,
          message: err.message,
          ...(err.details && { details: err.details }),
        },
        err.statusCode as ContentfulStatusCode,
      );
    }

    return c.json(
      {
        error: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
      500,
    );
  });

  app.notFound((c) => {
    logger.warn(LOG_MESSAGES.ROUTE_NOT_FOUND, {
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('user-agent'),
    });
    return c.text('Not Found', 404);
  });
}

export function createServer() {
  const app = new Hono<AppEnv>();

  registerBaseMiddleware(app);
  registerApiRoutes(app);
  app.get('/', (c) => c.json(createRootStatusPayload()));
  registerDocumentationRoutes(app);
  registerErrorHandlers(app);

  return app;
}
