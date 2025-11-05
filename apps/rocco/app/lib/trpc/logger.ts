import type { LogContext, LogEntry, LogLevel } from '../logger'
import { logger } from '../logger'

// PostHog integration for analytics and error tracking
// import { PostHog } from "posthog-node";

export function initPostHog() {
  // Only enable PostHog in production
  if (process.env.NODE_ENV !== 'production') {
    logger.info('PostHog disabled in development')
    return
  }

  const apiKey = process.env.POSTHOG_API_KEY
  if (!apiKey) {
    logger.warn('POSTHOG_API_KEY not configured')
    return
  }

  // PostHog.init(apiKey, {
  // 	host: process.env.POSTHOG_HOST || "https://app.posthog.com",
  // 	flushAt: 20,
  // 	flushInterval: 10000,
  // });
}

export function capturePostHogError(_error: Error, _context?: LogContext) {
  // Only send to PostHog in production
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  // PostHog.capture({
  // 	distinctId: "server",
  // 	event: "error",
  // 	properties: {
  // 		error: error.message,
  // 		stack: error.stack,
  // 		...context,
  // 	},
  // });
}

// Production logger wrapper
export class ProductionLogger {
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private async sendToExternalServices(entry: LogEntry) {
    if (entry.level === 'error' || entry.level === 'fatal') {
      if (process.env.POSTHOG_API_KEY) {
        capturePostHogError(entry.error as Error, entry.context)
      }
    }
  }

  async log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      stack: error?.stack,
    }

    // Send to external services
    await this.sendToExternalServices(entry)

    // Also log to console for immediate visibility
    console.error(JSON.stringify(entry))
  }

  async debug(message: string, context?: LogContext) {
    await this.log('debug', message, context)
  }

  async info(message: string, context?: LogContext) {
    await this.log('info', message, context)
  }

  async warn(message: string, context?: LogContext, error?: Error) {
    await this.log('warn', message, context, error)
  }

  async error(message: string, context?: LogContext, error?: Error) {
    await this.log('error', message, context, error)
  }

  async fatal(message: string, context?: LogContext, error?: Error) {
    await this.log('fatal', message, context, error)
  }
}

export function initProductionLogging() {
  if (process.env.POSTHOG_API_KEY) {
    initPostHog()
  }

  logger.info('Production logging initialized', {
    services: [process.env.POSTHOG_API_KEY && 'PostHog'].filter(Boolean),
  })
}
