import type { Context, Next } from 'hono';

import * as Sentry from '@sentry/node';

const { SENTRY_DSN, SENTRY_DEBUG, NODE_ENV } = process.env as Record<string, string>;

// Initialize Sentry
export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    enabled: !!SENTRY_DSN,
    debug: !!SENTRY_DEBUG,
    tracesSampleRate: 1,
  });

  Sentry.addIntegration(Sentry.httpIntegration({ spans: true }));
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

// Global error handler for Sentry
export function sentryErrorHandler(error: Error, c: Context) {
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
}
