import { getSpanContextForLogs } from '@hominem/telemetry/shared';
import {
  getHttpRequestInLogMessage,
  getHttpRequestLogLevel,
  getHttpRequestOutLogMessage,
  logAtLevel,
  logger,
} from '@hominem/utils/logger';
import type { MiddlewareHandler } from 'hono';

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = performance.now();
    const traceContext = getSpanContextForLogs();

    const startData = {
      method: c.req.method,
      path: c.req.path,
      ...traceContext,
    };

    logger.info(getHttpRequestInLogMessage(), startData);

    await next();

    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    const data = {
      durationMs,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ...traceContext,
    };
    const level = getHttpRequestLogLevel(data);
    const message = getHttpRequestOutLogMessage();

    logAtLevel(level, message, data);
  };
}
