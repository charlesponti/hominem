import { logger } from '@hominem/telemetry';
import type { Context } from 'hono';
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

function findServiceError(value: unknown, depth = 0): ServiceError | null {
  if (isServiceError(value)) {
    return value;
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
  const serviceError = findServiceError(err);

  if (serviceError) {
    const logData = {
      code: serviceError.code,
      message: serviceError.message,
      method,
      path,
      requestId,
      statusCode: serviceError.statusCode,
      ...(serviceError.details ? { details: serviceError.details } : {}),
    };

    if (serviceError.statusCode >= 500) {
      logger.error('[API Error]', { ...logData, error: serviceError });
    } else if (process.env.NODE_ENV !== 'test') {
      logger.warn('[API Client Error]', logData);
    }

    return c.json<ApiErrorResponse>(
      {
        error: serviceError.code.toLowerCase(),
        code: serviceError.code,
        message: serviceError.message,
        details: serviceError.details,
      },
      serviceError.statusCode as ContentfulStatusCode,
    );
  }

  logger.error(`[API Error] ${method} ${path} [${requestId}]`, {
    error: err,
    name: err instanceof Error ? err.name : 'unknown',
    message: err instanceof Error ? err.message : 'unknown',
  });

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
