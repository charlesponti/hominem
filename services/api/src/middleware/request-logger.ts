import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';

const httpTracer = getTelemetryTracer('hominem.http');

function logCompletedRequest(data: {
  durationMs: number;
  method: string;
  path: string;
  status: number;
}) {
  if (data.status >= 500) {
    logger.error('http_request_completed', data);
    return;
  }

  if (data.status >= 400) {
    logger.warn('http_request_completed', data);
    return;
  }

  logger.info('http_request_completed', data);
}

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();
    const span = httpTracer.startSpan('http.server', {
      attributes: {
        'http.request.method': c.req.method,
      },
    });
    if (process.env.NODE_ENV !== 'test') {
      logger.info('http_request_started', {
        method: c.req.method,
        path: c.req.path,
      });
    }

    try {
      await next();
      span.setStatus({
        code: c.res.status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
    } catch (error) {
      span.recordException(new Error('HTTP request failed'));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      const routePath = (c.req as unknown as { routePath?: string }).routePath;
      if (routePath) {
        span.setAttribute('http.route', routePath);
      }
      span.setAttribute('http.response.status_code', c.res.status);
      span.end();

      if (process.env.NODE_ENV !== 'test') {
        logCompletedRequest({
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
        });
      }
    }
  };
}
