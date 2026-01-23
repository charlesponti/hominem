/**
 * API Error Handler Utility
 *
 * Centralized error handling for ApiResult discriminated unions.
 * Use this utility to safely handle errors from API calls with type safety.
 *
 * Pattern:
 * ```typescript
 * const result = await apiCall();
 * if (result.success) {
 *   // result.data is typed and safe
 * } else {
 *   // result.code and result.message are available
 *   handleApiError(result);
 * }
 * ```
 */

import type { ApiError, ErrorCode } from '@hominem/services';

/**
 * Error message configuration
 * Maps error codes to user-friendly messages and action recommendations
 */
const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string; action?: string }> = {
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    description: 'Please check your input and try again.',
    action: 'HIGHLIGHT_FIELDS',
  },
  UNAUTHORIZED: {
    title: 'Not Signed In',
    description: 'Please sign in to continue.',
    action: 'REDIRECT_LOGIN',
  },
  FORBIDDEN: {
    title: 'Access Denied',
    description: "You don't have permission for this action.",
    action: 'SHOW_ALERT',
  },
  NOT_FOUND: {
    title: 'Not Found',
    description: "The item you're looking for doesn't exist.",
    action: 'GO_BACK',
  },
  CONFLICT: {
    title: 'Already Exists',
    description: 'This item already exists.',
    action: 'SHOW_ALERT',
  },
  UNAVAILABLE: {
    title: 'Service Unavailable',
    description: 'Service is temporarily unavailable. Please try again.',
    action: 'SHOW_RETRY',
  },
  INTERNAL_ERROR: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    action: 'SHOW_RETRY',
  },
};

/**
 * Get error message and recommended action for an error code
 *
 * @param code - The error code from ApiError
 * @returns Object with title, description, and optional action
 *
 * @example
 * const { title, description } = getErrorMessage('NOT_FOUND');
 * toast.error(title, { description });
 */
export function getErrorMessage(code: ErrorCode) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR;
}

/**
 * Handle an API error with user-friendly messaging
 *
 * This is the primary error handling function.
 * It logs the error and returns the configured message.
 *
 * @param error - The ApiError from an ApiResult
 * @returns The error configuration object
 *
 * @example
 * const result = await createList(...);
 * if (!result.success) {
 *   const errorConfig = handleApiError(result);
 *   toast.error(errorConfig.title, {
 *     description: result.message || errorConfig.description
 *   });
 * }
 */
export function handleApiError(error: ApiError) {
  const config = getErrorMessage(error.code);

  // Log error for debugging
  console.error(`[${error.code}] ${error.message}`, error.details || '');

  return config;
}

/**
 * Get HTTP status code for an error code
 *
 * Useful for logging and analytics
 *
 * @param code - The error code
 * @returns The HTTP status code
 */
export function getStatusCodeForError(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNAVAILABLE: 503,
    INTERNAL_ERROR: 500,
  };
  return statusMap[code] || 500;
}

/**
 * Check if an error is retriable
 *
 * Returns true for errors that might succeed on retry
 *
 * @param code - The error code
 * @returns true if the error is retriable
 */
export function isRetriableError(code: ErrorCode): boolean {
  return ['UNAVAILABLE', 'INTERNAL_ERROR'].includes(code);
}

/**
 * Format error details for display
 *
 * Used for validation errors that need field-level information
 *
 * @param error - The ApiError
 * @returns Formatted details or null
 *
 * @example
 * const details = formatErrorDetails(error);
 * if (details?.fields) {
 *   Object.entries(details.fields).forEach(([field, message]) => {
 *     setFieldError(field, message as string);
 *   });
 * }
 */
export function formatErrorDetails(error: ApiError) {
  if (!error.details) return null;

  if (error.code === 'VALIDATION_ERROR') {
    return {
      fields: error.details.fields || {},
    };
  }

  return error.details;
}
