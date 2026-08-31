import { createMiddleware } from 'hono/factory';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { AppContext } from './auth';
import type { ApiErrorResponse } from './error';

// Catches zValidator errors and turns them into a consistent JSON response.
// Needs to be registered before any routes that use zValidator.
export const validationErrorMiddleware = createMiddleware<AppContext>(async (c, next) => {
  try {
    return await next();
  } catch (err) {
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

    throw err;
  }
});

// Best-effort: pulls field-level details out of a zValidator error message if
// it happens to contain a JSON blob.
function parseValidationError(err: Error): Record<string, unknown> | undefined {
  try {
    const match = err.message.match(/\{.*\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
  } catch {
    // not JSON, no details to add
  }

  return undefined;
}
