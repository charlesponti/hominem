import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { isServiceError } from '@hominem/services';
import type { ErrorCode } from '@hominem/services';
import { logger } from '@hominem/utils/logger';

import type { AppContext } from './auth';

/**
 * Standard REST API error response format
 * 
 * Used for all HTTP error responses (4xx, 5xx)
 * HTTP status code is the definitive success/failure indicator
 */
export interface ApiErrorResponse {
  error: string;  // Lowercase error code (e.g., 'not_found', 'validation_error')
  code: ErrorCode;  // Original error code for client-side error handling
  message: string;  // Human-readable error message
  details?: Record<string, unknown> | undefined;  // Additional error context
}

/**
 * Global error middleware
 * 
 * Catches all unhandled exceptions and converts them to REST error responses.
 * Must be registered FIRST in the middleware chain.
 * 
 * Handles:
 * - ServiceError: Converts to formatted REST response with appropriate status code
 * - Other errors: Returns 500 Internal Server Error
 * - Validation errors: Already handled by zValidator, not caught here
 * 
 * @example
 * ```typescript
 * export const app = new Hono<AppContext>()
 *   .use(errorMiddleware)  // Must be first!
 *   .basePath('/api')
 *   // ... routes ...
 * ```
 */
export const errorMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const path = c.req.path;
  const method = c.req.method;

  try {
    return await next();
  } catch (err) {
    logger.error(`[API Error] ${method} ${path} [${requestId}]`, { error: err, name: err instanceof Error ? err.name : 'unknown', message: err instanceof Error ? err.message : 'unknown' });

    // Handle service errors (thrown by business logic)
    if (isServiceError(err)) {
      return c.json<ApiErrorResponse>(
        {
          error: err.code.toLowerCase().replace(/_/g, '_'),
          code: err.code,
          message: err.message,
          details: err.details,
        },
        err.statusCode as ContentfulStatusCode,
      );
    }

    // Handle unexpected errors
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
});
