import process from 'node:process'
import pino from 'pino'

const redactFields = ['email', 'password', 'token']

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  redact: {
    paths: redactFields.map((field) => `*.${field}`),
    censor: '[REDACTED]',
  },
  formatters: {
    level(label) {
      return { level: label }
    },
  },
})

// Create a properly typed logger wrapper
export const logger = {
  info: (message: string, data?: object) => pinoLogger.info(data, message),
  error: (message: string, error?: Error | object) => pinoLogger.error(error, message),
  warn: (message: string, data?: object) => pinoLogger.warn(data, message),
  debug: (message: string, data?: object) => pinoLogger.debug(data, message),
}
