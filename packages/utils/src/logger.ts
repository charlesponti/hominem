type PinoInstance = ((
  options: object,
  transport?: unknown,
) => {
  info: (data: object | undefined, message: string) => void;
  error: (error: Error | object | undefined, message: string) => void;
  warn: (data: object | undefined, message: string) => void;
  debug: (data: object | undefined, message: string) => void;
}) & {
  transport: (options: object) => unknown;
};

let pino: PinoInstance | null = null;
const logSinks = new Set<LogSink>();

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
export type LogValue = boolean | number | string;

export interface LogEntry {
  data?: Error | object;
  level: LoggerLevel;
  message: string;
  timestamp: number;
}

export type LogSink = (entry: LogEntry) => void;

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
  writeLog(level, message, data);
}

export function registerLogSink(sink: LogSink) {
  logSinks.add(sink);
  return () => {
    logSinks.delete(sink);
  };
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
    writeLog('info', message, data);
  },
  error: (message: string, error?: Error | object) => {
    writeLog('error', message, error);
  },
  warn: (message: string, data?: object) => {
    writeLog('warn', message, data);
  },
  debug: (message: string, data?: object) => {
    writeLog('debug', message, data);
  },
};

function writeLog(level: LoggerLevel, message: string, data?: Error | object) {
  if (pinoLogger) {
    if (level === 'error') {
      pinoLogger.error(data, message);
    } else if (level === 'warn') {
      pinoLogger.warn(data, message);
    } else if (level === 'debug') {
      pinoLogger.debug(data, message);
    } else {
      pinoLogger.info(data, message);
    }
  }

  if (logSinks.size === 0) {
    return;
  }

  const entry: LogEntry = {
    ...(data !== undefined ? { data } : {}),
    level,
    message,
    timestamp: Date.now(),
  };

  for (const sink of logSinks) {
    try {
      sink(entry);
    } catch {}
  }
}
