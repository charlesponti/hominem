import process from 'node:process'
import pino from 'pino'

const redactFields = ['email', 'password', 'token']

export const logger = pino({
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

export const log = logger.info.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
export const debug = logger.debug.bind(logger)
