/**
 * Service Error Types - Discriminated Union
 *
 * Clean, type-safe error handling using discriminated unions.
 * Each error has a `type` discriminator for exhaustive switch handling.
 *
 * Usage:
 *   import * as Err from '@hominem/services/errors';
 *
 *   function doSomething(): Err.Result<User, Err.ServiceError> {
 *     if (!user) return Err.fail(Err.notFound('User', id));
 *     return Err.ok(user);
 *   }
 */

// ============================================================================
// Error Type Definitions
// ============================================================================

export type ValidationError = {
  type: 'VALIDATION';
  message: string;
  field: string | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type NotFoundError = {
  type: 'NOT_FOUND';
  resource: string;
  id: string | undefined;
  details: Record<string, unknown> | undefined;
  message?: string;
  statusCode?: number;
};

export type UnauthorizedError = {
  type: 'UNAUTHORIZED';
  message: string | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type ForbiddenError = {
  type: 'FORBIDDEN';
  message: string | undefined;
  reason: 'ownership' | 'role' | 'subscription' | 'other' | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type ConflictError = {
  type: 'CONFLICT';
  message: string;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type UnavailableError = {
  type: 'UNAVAILABLE';
  message: string | undefined;
  service: string | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type InternalError = {
  type: 'INTERNAL';
  message: string | undefined;
  cause: unknown | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type RateLimitError = {
  type: 'RATE_LIMIT';
  message: string | undefined;
  retryAfter: number | undefined;
  details: Record<string, unknown> | undefined;
  statusCode?: number;
};

export type ServiceError =
  | ValidationError
  | NotFoundError
  | UnauthorizedError
  | ForbiddenError
  | ConflictError
  | UnavailableError
  | InternalError
  | RateLimitError;

// ============================================================================
// Error Constructors
// ============================================================================

export function validation(
  message: string,
  field?: string,
  details?: Record<string, unknown>,
): ValidationError {
  return { type: 'VALIDATION', message, field: field ?? undefined, details: details ?? undefined };
}

export function notFound(
  resource: string,
  id?: string,
  details?: Record<string, unknown>,
): NotFoundError {
  return { type: 'NOT_FOUND', resource, id: id ?? undefined, details: details ?? undefined };
}

export function unauthorized(message = 'Authentication required'): UnauthorizedError {
  return { type: 'UNAUTHORIZED', message: message ?? undefined, details: undefined };
}

export function forbidden(
  message = 'Access forbidden',
  reason: ForbiddenError['reason'] = 'other',
  details?: Record<string, unknown>,
): ForbiddenError {
  return {
    type: 'FORBIDDEN',
    message: message ?? undefined,
    reason: reason ?? undefined,
    details: details ?? undefined,
  };
}

export function conflict(message: string, details?: Record<string, unknown>): ConflictError {
  return { type: 'CONFLICT', message, details: details ?? undefined };
}

export function unavailable(
  message = 'Service unavailable',
  service?: string,
  details?: Record<string, unknown>,
): UnavailableError {
  return {
    type: 'UNAVAILABLE',
    message: message ?? undefined,
    service: service ?? undefined,
    details: details ?? undefined,
  };
}

export function internal(
  message = 'Internal server error',
  cause?: unknown,
  details?: Record<string, unknown>,
): InternalError {
  return {
    type: 'INTERNAL',
    message: message ?? undefined,
    cause: cause ?? undefined,
    details: details ?? undefined,
  };
}

export function rateLimit(
  message = 'Rate limit exceeded',
  retryAfter?: number,
  details?: Record<string, unknown>,
): RateLimitError {
  return {
    type: 'RATE_LIMIT',
    message: message ?? undefined,
    retryAfter: retryAfter ?? undefined,
    details: details ?? undefined,
  };
}

// ============================================================================
// Result Type for Railway-Oriented Programming
// ============================================================================

export type Result<T, E = ServiceError> = { success: true; data: T } | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E extends ServiceError>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// HTTP Status Mapping
// ============================================================================

export function getHttpStatus(error: ServiceError): number {
  switch (error.type) {
    case 'VALIDATION':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMIT':
      return 429;
    case 'UNAVAILABLE':
      return 503;
    case 'INTERNAL':
      return 500;
    default:
      return 500;
  }
}

export function getErrorCode(error: ServiceError): string {
  return error.type;
}

export function toHttpResponse(error: ServiceError) {
  return {
    status: getHttpStatus(error),
    body: {
      error: {
        code: getErrorCode(error),
        ...error,
      },
    },
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    [
      'VALIDATION',
      'NOT_FOUND',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'CONFLICT',
      'UNAVAILABLE',
      'INTERNAL',
      'RATE_LIMIT',
    ].includes(error.type)
  );
}

// ============================================================================
// Legacy Compatibility Exports (to be removed after migration)
// ============================================================================

export interface ErrorDetails {
  [key: string]: unknown;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'UNAVAILABLE'
  | 'INTERNAL_ERROR';
