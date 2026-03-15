let pino: any = null;

// Only import and initialize in Node.js environment
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try {
    // Using require for Node.js environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    pino = require('pino');
  } catch {
    // Fallback if require is not available
    pino = null;
  }
}

const redactFields = ['email', 'password', 'token'];
const isPrettyLoggingEnabled =
  typeof process !== 'undefined' &&
  process.env &&
  process.env.NODE_ENV !== 'production' &&
  process.env.NODE_ENV !== 'test';

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

const transport =
  pino !== null && isPrettyLoggingEnabled
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
          singleLine: true,
          translateTime: 'SYS:standard',
        },
      })
    : undefined;

const pinoLogger =
  pino !== null
    ? pino(
        {
          base: null,
          level: (typeof process !== 'undefined' && process.env?.LOG_LEVEL) || 'debug',
          redact: {
            paths: redactFields.map((field) => `*.${field}`),
            censor: '[REDACTED]',
          },
          formatters: {
            level(label: string) {
              return { level: label };
            },
          },
        },
        transport,
      )
    : null;

export const logger = {
  info: (message: string, data?: object) => {
    if (pinoLogger) pinoLogger.info(data, message);
  },
  error: (message: string, error?: Error | object) => {
    if (pinoLogger) pinoLogger.error(error, message);
  },
  warn: (message: string, data?: object) => {
    if (pinoLogger) pinoLogger.warn(data, message);
  },
  debug: (message: string, data?: object) => {
    if (pinoLogger) pinoLogger.debug(data, message);
  },
};
