export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE'

const ERROR_CODES: ReadonlySet<ErrorCode> = new Set([
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'CONFLICT',
  'INTERNAL_ERROR',
  'UNAVAILABLE',
])

export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown> | undefined

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Object.setPrototypeOf(this, ServiceError.prototype)
    this.name = this.constructor.name
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details)
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends ServiceError {
  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details)
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class UnavailableError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNAVAILABLE', 503, details)
    Object.setPrototypeOf(this, UnavailableError.prototype)
  }
}

export class InternalError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'INTERNAL_ERROR', 500, details)
    Object.setPrototypeOf(this, InternalError.prototype)
  }
}

export function isServiceError(value: unknown): value is ServiceError {
  if (value instanceof ServiceError) {
    return true
  }

  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as {
    message?: string
    code?: string
    statusCode?: number
    details?: Record<string, unknown> | undefined
  }

  return (
    typeof candidate.message === 'string' &&
    typeof candidate.code === 'string' &&
    ERROR_CODES.has(candidate.code as ErrorCode) &&
    typeof candidate.statusCode === 'number' &&
    Number.isInteger(candidate.statusCode) &&
    candidate.statusCode >= 400 &&
    candidate.statusCode <= 599
  )
}
