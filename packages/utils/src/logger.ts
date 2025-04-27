import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pino from 'pino'

const LOG_FILE = path.resolve(process.cwd(), './logs/error.log')
if (!fs.existsSync(LOG_FILE)) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  fs.writeFileSync(LOG_FILE, '')
}

const redactFields = ['email', 'password', 'token']

const streams = [
  { stream: process.stdout },
  { stream: fs.createWriteStream(LOG_FILE, { flags: 'a' }), level: 'error' },
]

export const logger = pino(
  {
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
  },
  pino.multistream(streams)
)

export const log = logger.info.bind(logger)
export const info = logger.info.bind(logger)
export const warn = logger.warn.bind(logger)
export const error = logger.error.bind(logger)
export const debug = logger.debug.bind(logger)
