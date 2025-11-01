import { TRPCError } from '@trpc/server'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  userId?: string
  requestId?: string
  path?: string
  method?: string
  userAgent?: string
  ip?: string
  [key: string]: unknown
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: Error | TRPCError
  stack?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry

    if (this.isDevelopment) {
      // Development: Human-readable format with colors
      const colorMap = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m', // Green
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        fatal: '\x1b[35m', // Magenta
      }
      const reset = '\x1b[0m'

      let formatted = `${colorMap[level]}[${level.toUpperCase()}]${reset} ${timestamp} - ${message}`

      if (context && Object.keys(context).length > 0) {
        formatted += `\n  Context: ${JSON.stringify(context, null, 2)}`
      }

      if (error) {
        formatted += `\n  Error: ${error.message}`
        if (error.stack) {
          formatted += `\n  Stack: ${error.stack}`
        }
      }

      return formatted
    }

    // Production: JSON format for log aggregation
    return JSON.stringify({
      level,
      message,
      timestamp,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error instanceof TRPCError && {
              code: error.code,
            }),
          }
        : undefined,
    })
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | TRPCError
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      stack: error?.stack,
    }

    const formattedMessage = this.formatMessage(entry)

    // In development, use console methods
    if (this.isDevelopment) {
      switch (level) {
        case 'debug':
          // biome-ignore lint/suspicious/noConsole: reason
          console.debug(formattedMessage)
          break
        case 'info':
          console.info(formattedMessage)
          break
        case 'warn':
          console.warn(formattedMessage)
          break
        case 'error':
        case 'fatal':
          console.error(formattedMessage)
          break
      }
    } else {
      // In production, use console.error for all levels to ensure visibility
      // In a real production environment, you'd send this to a logging service
      console.error(formattedMessage)

      // TODO: Integrate with external logging services like:
      // - PostHog for analytics and error tracking
      // - DataDog for monitoring
      // - CloudWatch for AWS environments
      // - LogRocket for session replay
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error)
  }

  error(message: string, context?: LogContext, error?: Error | TRPCError): void {
    this.log('error', message, context, error)
  }

  fatal(message: string, context?: LogContext, error?: Error | TRPCError): void {
    this.log('fatal', message, context, error)
  }

  // Convenience method for tRPC errors
  logTRPCError(error: TRPCError, context?: LogContext): void {
    const level = this.getErrorLevel(error)
    this.log(level, `tRPC Error: ${error.message}`, context, error)
  }

  // Determine log level based on tRPC error code
  private getErrorLevel(error: TRPCError): LogLevel {
    switch (error.code) {
      case 'BAD_REQUEST':
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
      case 'NOT_FOUND':
        return 'warn'
      case 'TIMEOUT':
      case 'TOO_MANY_REQUESTS':
        return 'error'
      case 'INTERNAL_SERVER_ERROR':
      case 'METHOD_NOT_SUPPORTED':
      case 'PARSE_ERROR':
      case 'UNSUPPORTED_MEDIA_TYPE':
        return 'fatal'
      default:
        return 'error'
    }
  }

  // Method for logging API requests
  logRequest(method: string, path: string, context?: LogContext): void {
    this.info(`${method} ${path}`, context)
  }

  // Method for logging API responses
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info'
    this.log(level, `${method} ${path} - ${statusCode} (${duration}ms)`, context)
  }
}

// Export singleton instance
export const logger = new Logger()
