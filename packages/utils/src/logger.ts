import path from 'node:path'
import { cwd } from 'node:process'
import { createLogger, format, transports } from 'winston'

const LOG_FILE = path.resolve(cwd(), './logs/error.log')
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
    level: 'debug',
    format: format.combine(
      format.colorize(),
      format.simple(),
      format.printf(
        ({ level, message, label, timestamp }) => `${timestamp} [${label}] ${level}: ${message}`
      )
    ),
  }),
]

export const logger = createLogger({
  format: format.combine(format.timestamp()),
  transports: logTransports,
  defaultMeta: { service: 'api' },
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
})
