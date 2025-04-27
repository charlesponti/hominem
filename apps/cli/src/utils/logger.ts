import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pino from 'pino'

const LOG_DIR = path.resolve(process.cwd(), 'logs')
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true })
}

const streams = [
  { stream: process.stdout },
  { stream: createWriteStream(path.join(LOG_DIR, 'error.log'), { flags: 'a' }), level: 'error' },
  { stream: createWriteStream(path.join(LOG_DIR, 'combined.log'), { flags: 'a' }) },
]

export const logger = pino(
  {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    formatters: {
      level(label) {
        return { level: label }
      },
    },
  }
  // pino.multistream(streams)
)

export default logger

export const debug = logger.debug.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
