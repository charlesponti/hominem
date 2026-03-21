import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppContext } from './auth';
import type { ApiErrorResponse } from './error';

/**
 * Validation Error Middleware
 *
 * Catches zValidator validation errors and converts them to consistent REST responses.
 * Must be registered BEFORE routes that use zValidator.
 *
 * Validation error response includes:
 * - error: 'validation_error'
 * - code: 'VALIDATION_ERROR'
 * - message: Human-readable summary
 * - details: Object mapping field paths to error messages
 *
 * @example
 * ```typescript
 * export const app = new Hono<AppContext>()
 *   .use(validationErrorMiddleware)
 *   .use(errorMiddleware)
 *   // ... routes ...
 * ```
 */
export const validationErrorMiddleware = createMiddleware<AppContext>(async (c, next) => {
  try {
    return await next();
  } catch (err) {
    // Check if it's a zValidator error
    if (err instanceof Error && err.message.includes('validation')) {
      return c.json<ApiErrorResponse>(
        {
          error: 'validation_error',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: parseValidationError(err),
        },
        400 as ContentfulStatusCode,
      );
    }

    // Re-throw if it's not a validation error
    throw err;
  }
});

/**
 * Parse validation error details from zValidator error messages.
 * Attempts to extract field-level error information.
 */
function parseValidationError(err: Error): Record<string, unknown> | undefined {
  try {
    // Try to extract details from the error message if it contains JSON
    const match = err.message.match(/\{.*\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
  } catch {
    // Silently ignore parsing errors
  }

  // Return undefined so error middleware doesn't include the details
  return undefined;
}
