import fs from 'node:fs'
import path from 'node:path'
import { cwd } from 'node:process'
import type { LeveledLogMethod, Logger as WinstonLogger } from 'winston'
import winston from 'winston'

const LOG_FILE = path.resolve(cwd(), './logs/error.log')
if (!fs.existsSync(LOG_FILE)) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true })
  fs.writeFileSync(LOG_FILE, '')
}

const redactFields = ['email', 'password', 'token'] as const

function redactSensitiveInfo(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (redactFields.includes(key as (typeof redactFields)[number])) {
        return '[REDACTED]'
      }
      return value
    })
  )
}

const baselogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  defaultMeta: { service: 'api' },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
          let msg = `${timestamp} ${level}: ${service} - ${typeof message === 'string' ? message : JSON.stringify(message)}`
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`
          }
          return msg
        })
      ),
    }),
    new winston.transports.File({
      filename: LOG_FILE,
      level: 'error',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
})

type LoggerWithRedaction = Omit<WinstonLogger, 'log' | 'error' | 'warn' | 'info' | 'debug'> & {
  [K in 'log' | 'error' | 'warn' | 'info' | 'debug']: LeveledLogMethod
}

export const logger = baselogger as LoggerWithRedaction

const methods = ['error', 'warn', 'info', 'debug', 'log'] as const
for (const method of methods) {
  const original = logger[method].bind(baselogger)
  logger[method] = ((info: string | object, ...args: unknown[]) => {
    try {
      let processedInfo: string
      if (typeof info === 'object' && info !== null) {
        processedInfo = JSON.stringify(redactSensitiveInfo(info as Record<string, unknown>))
      } else {
        processedInfo = String(info)
      }

      return original(processedInfo, ...args)
    } catch (error) {
      return logger.error('Error processing log message', {
        originalMessage: typeof info === 'string' ? info : '[Object]',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }) as LeveledLogMethod
}
