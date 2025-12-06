import { TRPCError } from '@trpc/server'
import { logger } from './logger'

// Custom error classes for different types of errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ExternalServiceError'
  }
}

// Error handling utilities
export function handleDatabaseError(error: unknown, operation: string): never {
  const context = { operation, error: error as Error }

  if (error instanceof Error) {
    logger.error(`Database error during ${operation}`, context, error)
    throw new DatabaseError(`Failed to ${operation}`, error)
  }

  logger.error(`Unknown database error during ${operation}`, context)
  throw new DatabaseError(`Failed to ${operation}`)
}

export function handleExternalServiceError(
  error: unknown,
  service: string,
  operation: string
): never {
  const context = { service, operation, error: error as Error }

  if (error instanceof Error) {
    logger.error(`${service} error during ${operation}`, context, error)
    throw new ExternalServiceError(`Failed to ${operation}`, service, error)
  }

  logger.error(`Unknown ${service} error during ${operation}`, context)
  throw new ExternalServiceError(`Failed to ${operation}`, service)
}

export function handleValidationError(message: string, field?: string): never {
  const error = new ValidationError(message, field)
  logger.warn('Validation error', { message, field })
  throw error
}

// Convert custom errors to tRPC errors
export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error
  }

  if (error instanceof ValidationError) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
    })
  }

  if (error instanceof DatabaseError) {
    logger.error('Database error converted to tRPC error', { error }, error)
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database operation failed',
    })
  }

  if (error instanceof ExternalServiceError) {
    logger.error('External service error converted to tRPC error', { error }, error)
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `${error.service} service unavailable`,
    })
  }

  if (error instanceof Error) {
    logger.error('Unknown error converted to tRPC error', { error }, error)
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    })
  }

  logger.error('Non-Error object converted to tRPC error', { error })
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  })
}

// Safe async wrapper for procedures
export function safeAsync<T>(
  fn: () => Promise<T>,
  operation: string,
  context?: Record<string, unknown>
): Promise<T> {
  return fn().catch((error) => {
    logger.error(
      `Error in ${operation}`,
      {
        ...context,
        error: error as Error,
      },
      error as Error
    )
    throw toTRPCError(error)
  })
}

// Error response formatter
export function formatErrorResponse(error: unknown): {
  message: string
  code?: string
  details?: unknown
} {
  if (error instanceof TRPCError) {
    console.error('TRPCError', error)
    return {
      message: error.message,
      code: error.code,
    }
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
      details: { field: error.field },
    }
  }

  if (error instanceof DatabaseError) {
    return {
      message: 'Database operation failed',
      code: 'DATABASE_ERROR',
    }
  }

  if (error instanceof ExternalServiceError) {
    return {
      message: `${error.service} service unavailable`,
      code: 'EXTERNAL_SERVICE_ERROR',
      details: { service: error.service },
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  }
}
