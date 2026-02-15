import type { Context, Next } from 'hono';

import * as Sentry from '@sentry/node';

function getEnv() {
  return {
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_DEBUG: process.env.SENTRY_DEBUG,
    NODE_ENV: process.env.NODE_ENV,
  };
}

// Initialize Sentry - safe to call even without DSN
export function initSentry() {
  const { SENTRY_DSN, SENTRY_DEBUG, NODE_ENV } = getEnv();

  if (!SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not set, Sentry disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV || 'development',
    enabled: true,
    debug: !!SENTRY_DEBUG,
    tracesSampleRate: 1,
  });

  Sentry.addIntegration(Sentry.httpIntegration({ spans: true }));
  console.log('[Sentry] Initialized');
}

// Sentry middleware for Hono
export function sentryMiddleware() {
  return async (c: Context, next: Next) => {
    const transaction = Sentry.startInactiveSpan({
      name: 'HTTP request handler',
    });

    try {
      await next();
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTags({
          path: c.req.url,
          method: c.req.method,
        });
        scope.setExtras({
          'request URL': c.req.url,
          'user agent': c.req.header('user-agent'),
        });
        Sentry.captureException(error);
      });
      throw error;
    } finally {
      transaction?.end();
    }
  };
}

// Global error handler for Sentry - integrates with app.onError
export function sentryErrorHandler() {
  return (error: Error, c: Context) => {
    Sentry.withScope((scope) => {
      scope.setTags({
        path: c.req.url,
        method: c.req.method,
      });
      scope.setExtras({
        'request URL': c.req.url,
        'user agent': c.req.header('user-agent'),
      });
      Sentry.captureException(error);
    });
  };
}
