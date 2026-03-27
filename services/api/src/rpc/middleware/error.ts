import { isDbError } from '@hominem/db/services/_shared/errors';
import { logger } from '@hominem/utils/logger';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { isServiceError, type ErrorCode, type ServiceError } from '../errors';
import type { AppContext } from './auth';

/**
 * Standard REST API error response format
 *
 * Used for all HTTP error responses (4xx, 5xx)
 * HTTP status code is the definitive success/failure indicator
 */
export interface ApiErrorResponse {
  error: string; // Lowercase error code (e.g., 'not_found', 'validation_error')
  code: ErrorCode; // Original error code for client-side error handling
  message: string; // Human-readable error message
  details?: Record<string, unknown> | undefined; // Additional error context
}

function getStatusCode(error: ServiceError): ContentfulStatusCode {
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

function toApiErrorResponse(error: ServiceError): ApiErrorResponse {
  const message = 'message' in error ? error.message : undefined;
  const details = 'details' in error ? error.details : undefined;
  return {
    error: error.type.toLowerCase(),
    code: error.type as ErrorCode,
    message: message ?? 'An unexpected error occurred',
    details,
  };
}

function findServiceError(value: unknown, depth = 0) {
  if (isServiceError(value)) {
    return value;
  }

  if (isDbError(value)) {
    return {
      type:
        value.code === 'VALIDATION_ERROR'
          ? 'VALIDATION'
          : value.code === 'NOT_FOUND'
            ? 'NOT_FOUND'
            : value.code === 'FORBIDDEN'
              ? 'FORBIDDEN'
              : value.code === 'CONFLICT'
                ? 'CONFLICT'
                : 'INTERNAL',
      message: value.message,
      details: undefined,
      field: undefined,
      id: undefined,
      resource: 'resource',
      reason: undefined,
      service: undefined,
      cause: undefined,
      retryAfter: undefined,
    } as ServiceError;
  }

  if (!(value instanceof Error) || depth >= 3) {
    return null;
  }

  return findServiceError(value.cause, depth + 1);
}

export function apiErrorHandler(err: unknown, c: Context<AppContext>) {
  const requestId = c.get('requestId') || crypto.randomUUID().slice(0, 8);
  const path = c.req.path;
  const method = c.req.method;

  logger.error(`[API Error] ${method} ${path} [${requestId}]`, {
    error: err,
    name: err instanceof Error ? err.name : 'unknown',
    message: err instanceof Error ? err.message : 'unknown',
  });

  const serviceError = findServiceError(err);

  if (serviceError) {
    return c.json<ApiErrorResponse>(toApiErrorResponse(serviceError), getStatusCode(serviceError));
  }

  const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
  return c.json<ApiErrorResponse>(
    {
      error: 'internal_error',
      code: 'INTERNAL_ERROR',
      message: errorMessage,
    },
    500,
  );
}

/**
 * Legacy error middleware
 *
 * Hono does not route async handler exceptions through middleware reliably.
 * Register `apiErrorHandler` with `.onError(...)` for real application error handling.
 *
 * This export remains as a pass-through for backwards compatibility in tests.
 */
export const errorMiddleware = createMiddleware<AppContext>(async (_c, next) => next());
