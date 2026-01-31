/**
 * Centralized error hierarchy for Hominem services
 *
 * All service functions should throw these error types to communicate
 * failures to their callers. HTTP endpoints catch these errors and
 * convert them to appropriate HTTP responses.
 *
 * Pattern:
 * - Service throws specific error type
 * - HTTP endpoint catches and returns ApiResult with correct status code
 * - Client receives typed response
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE';

/**
 * Base error class for all service errors
 *
 * Includes error code, HTTP status code, and optional details for debugging
 */
export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Set prototype for instanceof checks
    Object.setPrototypeOf(this, ServiceError.prototype);
    this.name = this.constructor.name;
  }
}

/**
 * Validation failed
 *
 * Use when input validation fails (before business logic)
 * HTTP: 400 Bad Request
 *
 * @example
 * if (!email.includes('@')) {
 *   throw new ValidationError('Invalid email format', { field: 'email' })
 * }
 */
export class ValidationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Resource not found
 *
 * Use when a required resource doesn't exist
 * HTTP: 404 Not Found
 *
 * @example
 * const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
 * if (!user) {
 *   throw new NotFoundError('User', { userId })
 * }
 */
export class NotFoundError extends ServiceError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Authentication failed
 *
 * Use when user is not authenticated or token is invalid
 * HTTP: 401 Unauthorized
 *
 * @example
 * const user = await verifyToken(token)
 * if (!user) {
 *   throw new UnauthorizedError('Invalid token')
 * }
 */
export class UnauthorizedError extends ServiceError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Authorization failed
 *
 * Use when user is authenticated but not authorized for this action
 * HTTP: 403 Forbidden
 *
 * @example
 * if (list.userId !== currentUserId) {
 *   throw new ForbiddenError('You do not have permission to modify this list')
 * }
 */
export class ForbiddenError extends ServiceError {
  constructor(message: string = 'Access forbidden', details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Resource conflict
 *
 * Use when operation conflicts with existing state
 * (e.g., duplicate unique constraint, race condition)
 * HTTP: 409 Conflict
 *
 * @example
 * const existing = await findByEmail(email)
 * if (existing) {
 *   throw new ConflictError('User with this email already exists', { email })
 * }
 */
export class ConflictError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Service unavailable
 *
 * Use when a dependency (external service, database) is temporarily unavailable
 * HTTP: 503 Service Unavailable
 *
 * @example
 * try {
 *   return await externalApi.call()
 * } catch (error) {
 *   throw new UnavailableError('Google Places API is currently unavailable')
 * }
 */
export class UnavailableError extends ServiceError {
  constructor(message: string = 'Service unavailable', details?: Record<string, unknown>) {
    super(message, 'UNAVAILABLE', 503, details);
    Object.setPrototypeOf(this, UnavailableError.prototype);
  }
}

/**
 * Internal server error
 *
 * Use when an unexpected error occurs in the service
 * HTTP: 500 Internal Server Error
 *
 * @example
 * try {
 *   await someOperation()
 * } catch (error) {
 *   throw new InternalError(
 *     'Failed to complete operation',
 *     { originalError: error instanceof Error ? error.message : String(error) }
 *   )
 * }
 */
export class InternalError extends ServiceError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 'INTERNAL_ERROR', 500, details);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/**
 * Type guard to check if an error is a ServiceError
 *
 * @example
 * try {
 *   await someService()
 * } catch (error) {
 *   if (isServiceError(error)) {
 *     return handleServiceError(error)
 *   }
 *   throw error // Re-throw unexpected errors
 * }
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Convert any error to a ServiceError
 *
 * Useful in catch blocks to ensure all errors are typed
 *
 * @example
 * try {
 *   await externalApi.call()
 * } catch (error) {
 *   throw asServiceError(error, 'Failed to fetch from external API')
 * }
 */
export function asServiceError(error: unknown, message?: string): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  if (error instanceof Error) {
    return new ServiceError(message || error.message, 'INTERNAL_ERROR', 500, {
      originalError: error.message,
    });
  }

  return new ServiceError(message || 'An unexpected error occurred', 'INTERNAL_ERROR', 500, {
    error: String(error),
  });
}
