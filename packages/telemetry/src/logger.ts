type LogData = Record<string, unknown>;
type LogValue = unknown;
type LogLevel = 'debug' | 'error' | 'info' | 'warn';
type TelemetryLogSink = (level: LogLevel, message: string, data?: LogData) => void;

const REDACTED = '[REDACTED]';
const sensitiveFieldPatterns = [
  'authorization',
  'cookie',
  'decodedurl',
  'email',
  'imageurl',
  'password',
  'secret',
  'token',
];

let telemetryLogSink: TelemetryLogSink | null = null;

export function setTelemetryLogSink(sink: TelemetryLogSink | null) {
  telemetryLogSink = sink;
}

function isRecord(value: LogValue): value is LogData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSensitiveField(key: string) {
  const normalized = key.toLowerCase();
  return sensitiveFieldPatterns.some((field) => normalized.includes(field));
}

function serializeError(error: Error): LogData {
  return {
    error_name: error.name,
    error_message: error.message,
    ...(process.env.NODE_ENV !== 'test' && error.stack ? { error_stack: error.stack } : {}),
  };
}

function normalizeForLog(value: LogValue, seen = new WeakSet<object>()): LogValue {
  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForLog(item, seen));
  }

  if (!isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, currentValue]) => [
      key,
      isSensitiveField(key) ? REDACTED : normalizeForLog(currentValue, seen),
    ]),
  );
}

function formatMessage(level: LogLevel, message: string, data?: LogValue) {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const payload = data === undefined ? '' : ` ${JSON.stringify(normalizeForLog(data))}`;
  return `[${time}][${level}] ${message}${payload}`;
}

function writeLog(level: LogLevel, message: string, data?: LogValue) {
  const formatted = formatMessage(level, message, data);

  try {
    telemetryLogSink?.(level, message, isRecord(data) ? data : undefined);
  } catch {
    // never let telemetry break actual logging
  }

  switch (level) {
    case 'debug':
      console.debug(formatted);
      return;
    case 'error':
      console.error(formatted);
      return;
    case 'warn':
      console.warn(formatted);
      return;
    case 'info':
      console.info(formatted);
      return;
  }
}

export const logger = {
  debug: (message: string, data?: LogData) => writeLog('debug', message, data),
  error: (message: string, error?: Error | LogData) => writeLog('error', message, error),
  info: (message: string, data?: LogData) => writeLog('info', message, data),
  warn: (message: string, data?: LogData) => writeLog('warn', message, data),
};
