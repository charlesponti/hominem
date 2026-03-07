/**
 * Shared database service error taxonomy and utilities
 * 
 * Services throw typed errors for system failures. Framework/RPC layer handles mapping to HTTP status codes.
 */

/**
 * Base class for all DB service errors
 * 
 * Error contract:
 * - listX returns empty array on no matches (never throws NotFound)
 * - getX returns null on not found (never throws NotFound)
 * - create/update/delete operations throw typed errors for system failures
 * - Infrastructure errors (DB connection, constraint violations) throw with type info
 */
export abstract class DbError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when a required resource does not exist
 * Only thrown by create/update/delete operations that have implicit dependencies
 * Never thrown by get/list (those return null or [])
 */
export class NotFoundError extends DbError {
  readonly code = 'NOT_FOUND'
  readonly statusCode = 404

  constructor(message: string, public readonly entityType?: string, public readonly entityId?: unknown) {
    super(message)
  }
}

/**
 * Thrown when input violates constraints (unique, foreign key, check, etc.)
 * Indicates a data integrity issue in the client's request
 */
export class ConflictError extends DbError {
  readonly code = 'CONFLICT'
  readonly statusCode = 409

  constructor(message: string, public readonly constraint?: string) {
    super(message)
  }
}

export class ValidationError extends DbError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400

  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message)
  }
}

/**
 * Thrown when the user lacks permission to perform an operation
 * Authorization failures at the DB service layer (ownership checks, scoping, etc.)
 */
export class ForbiddenError extends DbError {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403

  constructor(message: string, public readonly reason?: string) {
    super(message)
  }
}

/**
 * Thrown for database/infrastructure failures
 * Maps to 500 Internal Server Error
 */
export class InternalError extends DbError {
  readonly code = 'INTERNAL'
  readonly statusCode = 500

  constructor(message: string, public readonly cause?: unknown) {
    super(message)
  }
}

/**
 * Type guard to check if error is a DbError
 */
export function isDbError(error: unknown): error is DbError {
  return error instanceof DbError
}

export function isServiceError(error: unknown): error is DbError {
  return isDbError(error)
}

/**
 * Get HTTP status code and error code from a DB service error
 * Used by API layer error middleware to generate HTTP responses
 */
export function getErrorResponse(error: unknown): { code: string; statusCode: number; message: string } {
  if (isDbError(error)) {
    return {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
    }
  }
  // Unknown error -> 500 Internal Server Error
  return {
    code: 'INTERNAL',
    statusCode: 500,
    message: 'Internal server error',
  }
}
