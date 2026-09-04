import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import type { MiddlewareHandler } from 'hono';
import { routePath } from 'hono/route';

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
  return (c, next) =>
    httpTracer.startActiveSpan(
      'http.server',
      {
        attributes: { 'http.request.method': c.req.method },
      },
      async (span) => {
        const startedAt = performance.now();
        if (process.env.NODE_ENV !== 'test') {
          logger.info('http_request_started', { method: c.req.method, path: c.req.path });
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
          const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
          const route = routePath(c);
          if (route) span.setAttribute('http.route', route);
          span.setAttributes({
            'http.response.status_code': c.res.status,
            'http.server.duration_ms': durationMs,
          });
          span.end();

          if (process.env.NODE_ENV !== 'test') {
            logCompletedRequest({
              durationMs,
              method: c.req.method,
              path: c.req.path,
              status: c.res.status,
            });
          }
        }
      },
    );
}
