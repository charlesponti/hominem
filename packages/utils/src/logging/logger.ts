import path from 'node:path'
import { cwd } from 'node:process'
import { createLogger, format, transports } from 'winston'

const LOG_FILE = path.resolve(cwd(), './logs/error.log')

// Create a base logger factory for customization
export const createAppLogger = (
  options: {
    service?: string
    label?: string
    level?: string
  } = {}
) => {
  const logTransports = [
    new transports.File({
      level: 'error',
      filename: LOG_FILE,
      format: format.json({
        replacer: (key, value) => {
          if (key === 'error') {
            return {
              message: (value as Error).message,
              stack: (value as Error).stack,
            }
          }
          return value
        },
      }),
    }),
    new transports.Console({
      level: options.level || 'debug',
      format: format.combine(
        format.colorize(),
        format.simple(),
        format.printf(
          ({ level, message, label, timestamp }) =>
            `${timestamp} [${label || 'system'}] ${level}: ${message}`
        )
      ),
    }),
  ]

  return createLogger({
    format: format.combine(
      format.timestamp(),
      format.label({ label: options.label || options.service || 'app' })
    ),
    transports: logTransports,
    defaultMeta: { service: options.service || 'api' },
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    },
  })
}

// Default logger instance
export const logger = createAppLogger()

// Helper method to get a custom logger anywhere in the code
export const getLogger = (options: { label?: string; service?: string; level?: string } = {}) => {
  return createAppLogger(options)
}
