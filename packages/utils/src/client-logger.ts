/**
 * Browser-compatible logger using native console APIs.
 * Use this in client-side code. For server-side code, use `@hominem/utils/logger`.
 */

export interface HttpRequestLogData {
  durationMs: number;
  method: string;
  path: string;
  status: number;
}

export interface HttpRequestStartLogData {
  method: string;
  path: string;
}

export type LoggerLevel = 'debug' | 'error' | 'info' | 'warn';

export function getHttpRequestLogLevel({ durationMs, status }: HttpRequestLogData): LoggerLevel {
  if (status >= 500) {
    return 'error';
  }

  if (durationMs >= 1000) {
    return 'warn';
  }

  return 'info';
}

export function getHttpRequestInLogMessage() {
  return 'http_request_in';
}

export function getHttpRequestOutLogMessage() {
  return 'http_request_out';
}

export function logAtLevel(level: LoggerLevel, message: string, data?: Error | object) {
  if (level === 'error') {
    logger.error(message, data);
    return;
  }

  if (level === 'warn') {
    logger.warn(message, data);
    return;
  }

  if (level === 'debug') {
    logger.debug(message, data);
    return;
  }

  logger.info(message, data);
}

function redactFields(data: object | undefined): object | undefined {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = ['email', 'password', 'token'];
  const redacted = { ...data };

  for (const key of Object.keys(redacted)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      (redacted as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }

  return redacted;
}

export const logger = {
  info: (message: string, data?: object) => {
    // eslint-disable-next-line no-console
    console.log(message, redactFields(data));
  },
  error: (message: string, error?: Error | object) => {
    // eslint-disable-next-line no-console
    console.error(message, redactFields(error));
  },
  warn: (message: string, data?: object) => {
    // eslint-disable-next-line no-console
    console.warn(message, redactFields(data));
  },
  debug: (message: string, data?: object) => {
    // eslint-disable-next-line no-console
    console.debug(message, redactFields(data));
  },
};
