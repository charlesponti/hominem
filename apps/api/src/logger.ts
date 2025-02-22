import fs from 'node:fs'
import path from 'node:path'
import { cwd } from 'node:process'
import pino from 'pino'

// Create file if it doesn't exist
const LOG_FILE = path.resolve(cwd(), './logs/error.log')
if (!fs.existsSync(LOG_FILE)) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  fs.writeFileSync(LOG_FILE, '')
}

const logger = pino({
  level: process.env.PINO_LOG_LEVEL || 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'api' },
  hooks: {
    logMethod(inputArgs, method, level) {
      if (inputArgs.length === 2 && inputArgs[1].error instanceof Error) {
        const err = inputArgs[1].error
        inputArgs[1].error = {
          message: err.message,
          stack: err.stack,
        }
      }
      return method.apply(this, inputArgs)
    },
  },
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          messageFormat: '{service} - {msg}',
        },
      },
      {
        target: 'pino/file',
        level: 'error',
        options: { destination: LOG_FILE },
      },
    ],
  },
  redact: {
    paths: ['email', '*.email'],
    remove: true,
  },
})

export default logger
