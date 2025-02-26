import { logger } from './logger'

export class AppError extends Error {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  public context?: Record<string, any>
  public code: string
  public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  constructor({
    message,
    code,
    severity = 'MEDIUM',
    context = {},
  }: {
    message: string
    code: string
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    context?: Record<string, any>
  }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.severity = severity
    this.context = context
  }
}

export function logError(error: Error | AppError, additionalContext = {}) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error instanceof AppError && {
      code: error.code,
      severity: error.severity,
      context: error.context,
    }),
    ...additionalContext,
  }

  // Log to console/file
  logger.error('Error occurred:', errorLog)
}
