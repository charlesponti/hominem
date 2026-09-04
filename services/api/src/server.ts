import { LOG_MESSAGES, logger } from '@hominem/telemetry';
import { Scalar } from '@scalar/hono-api-reference';
import * as Sentry from '@sentry/node';
import { Hono, type MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { betterAuthServer, createBetterAuthServer } from './auth/better-auth';
import type { AuthContext } from './auth/types';
import { API_BRAND } from './brand';
import { env } from './env';
import type { ApiEnv } from './env.schema';
import { isServiceError } from './errors';
import { createMcpRoutes } from './mcp/routes';
import { createAuthMiddleware } from './middleware/auth';
import { blockMaliciousProbes } from './middleware/block-probes';
import { requestLogger } from './middleware/request-logger';
import { securityHeadersMiddleware } from './middleware/security-headers';
import { createAuthRoutes } from './routes/auth';
import { imagesRoutes } from './routes/images';
import { legalRoutes } from './routes/legal';
import { createLoginRoutes } from './routes/login';
import { statusRoutes } from './routes/status';
import { rpcApp } from './rpc/app';

export type AppEnv = {
  Variables: {
    auth?: AuthContext;
  };
};

const ALLOWED_CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
const CHATGPT_ORIGINS = ['https://chatgpt.com', 'https://chat.openai.com'];
function createAllowedOrigins(inputEnv = env) {
  return new Set([
    inputEnv.API_URL,
    inputEnv.WEB_URL,
    inputEnv.FINANCE_URL,
    inputEnv.CAREER_URL,
    inputEnv.WHAT_URL,
    ...CHATGPT_ORIGINS,
  ]);
}

// OAuth discovery/registration endpoints (RFC 8414/9728/7591) get hit by any
// MCP client's own origin (e.g. claude.ai). They don't use cookies, so
// reflecting back whatever origin called us is safe here.
function isPublicMcpAuthPath(path: string) {
  return (
    path.startsWith('/.well-known/') ||
    path.startsWith('/api/auth/.well-known/') ||
    path.startsWith('/api/auth/oauth2/') ||
    path === '/api/auth/jwks'
  );
}

function createCorsMiddleware(inputEnv = env): MiddlewareHandler {
  const allowedOrigins = createAllowedOrigins(inputEnv);

  return cors({
    origin: (origin, c) =>
      isPublicMcpAuthPath(c.req.path)
        ? origin || null
        : allowedOrigins.has(origin || '')
          ? origin
          : null,
    credentials: true,
    allowMethods: ALLOWED_CORS_METHODS,
  });
}

function createAuthHandler(auth: typeof betterAuthServer) {
  return (c: { req: { raw: Request } }) => auth.handler(c.req.raw);
}

function createRootStatusPayload() {
  return {
    status: 'ok',
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

export type ServerDependencies = {
  env: ApiEnv;
  auth: typeof betterAuthServer;
};

function registerBaseMiddleware(app: Hono<AppEnv>, dependencies: ServerDependencies) {
  app.use('*', blockMaliciousProbes());
  app.use('*', requestLogger());
  app.use('*', prettyJSON());
  app.use('*', createCorsMiddleware(dependencies.env));
  app.use('*', securityHeadersMiddleware(dependencies.env));
  app.use('*', createAuthMiddleware(dependencies.auth));
}

function registerApiRoutes(app: Hono<AppEnv>, dependencies: ServerDependencies) {
  const authHandler = createAuthHandler(dependencies.auth);
  const { mcpRoutes, oauthDiscoveryRoutes } = createMcpRoutes(dependencies);
  const authRoutes = createAuthRoutes(dependencies);
  const loginRoutes = createLoginRoutes(dependencies);

  app.route('/', rpcApp);
  // MCP stays outside the client-facing RPC contract - it's server-only and
  // its Redis-backed code shouldn't leak into mobile typechecking.
  app.route('/api/mcp', mcpRoutes);
  // Has to be mounted at root - RFC 8414 / RFC 9728 require it there.
  app.route('/', oauthDiscoveryRoutes);
  app.route('/', loginRoutes);
  app.route('/', legalRoutes);
  // Our own auth extras go first (session/logout reshape for apps/finance, e2e helpers).
  // Anything under /api/auth/* that doesn't match falls through to Better Auth's catch-all.
  app.route('/api/auth', authRoutes);
  app.route('/api/status', statusRoutes);
  app.on(['GET', 'POST'], '/api/auth', authHandler);
  app.on(['GET', 'POST'], '/api/auth/*', authHandler);
  app.route('/api/images', imagesRoutes);
}

function registerDocumentationRoutes(app: Hono<AppEnv>) {
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

function registerErrorHandlers(app: Hono<AppEnv>, inputEnv: ApiEnv) {
  app.onError((err, c) => {
    if (inputEnv.SENTRY_DSN && inputEnv.NODE_ENV !== 'development') {
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
        // `isServiceError` already checked statusCode is an integer in [400, 599],
        // so it's a valid HTTP status by construction.
        // oxlint-disable-next-line typescript/consistent-type-assertions
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

export function createServer(overrides: Partial<ServerDependencies> = {}) {
  const inputEnv = overrides.env ?? env;
  const dependencies: ServerDependencies = {
    env: inputEnv,
    auth: overrides.auth ?? (overrides.env ? createBetterAuthServer(inputEnv) : betterAuthServer),
  };
  const app = new Hono<AppEnv>();

  registerBaseMiddleware(app, dependencies);
  registerApiRoutes(app, dependencies);
  app.get('/', (c) => c.json(createRootStatusPayload()));
  registerDocumentationRoutes(app);
  registerErrorHandlers(app, dependencies.env);

  return app;
}
