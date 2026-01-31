/**
 * API Result Type
 *
 * Represents the result of an API operation. Used to wrap service results
 * when converting from service layer (which throws errors) to HTTP responses.
 *
 * Pattern:
 * - Service functions throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 *
 * Benefits:
 * - Type system forces handling of both success and error cases
 * - Discriminator field enables type narrowing
 * - Structured error details for debugging
 * - Clear contract between server and client
 *
 * @deprecated This pattern is being migrated to standard REST API practices.
 * New code should return data directly with HTTP status codes for success/error.
 */

import type { ErrorCode } from './errors';

/**
 * Standard REST API error response format
 *
 * Used for all HTTP error responses (4xx, 5xx).
 * HTTP status code is the definitive success/failure indicator.
 *
 * @example
 * ```typescript
 * return c.json<ApiErrorResponse>(
 *   {
 *     error: 'not_found',
 *     code: 'NOT_FOUND',
 *     message: 'Resource not found',
 *     details: { resourceId: '123' }
 *   },
 *   404
 * );
 * ```
 */
export interface ApiErrorResponse {
  error: string; // Lowercase error code (e.g., 'not_found', 'validation_error')
  code: ErrorCode; // Original error code enum for client-side handling
  message: string; // Human-readable error message
  details?: Record<string, unknown>; // Additional error context
}

/**
 * Successful API response
 *
 * @template T The type of data being returned
 *
 * @deprecated This pattern is being migrated to standard REST API practices.
 * New code should return data directly without the wrapper.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Error API response
 *
 * Structured error with code, message, and optional details.
 * Never includes HTTP status code (that's in the HTTP response headers).
 *
 * @deprecated This pattern is being migrated to standard REST API practices.
 * Use ApiErrorResponse instead.
 */
export interface ApiError {
  success: false;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | undefined;
}

/**
 * API Result: Discriminated union of success or error
 *
 * Use the `success` discriminator to narrow the type:
 *
 * @example
 * ```typescript
 * const result = await apiCall()
 *
 * if (result.success) {
 *   // result.data is typed
 *   console.log(result.data.id)
 * } else {
 *   // result.code and result.message are available
 *   console.error(`Error ${result.code}: ${result.message}`)
 * }
 * ```
 *
 * @deprecated This pattern is being migrated to standard REST API practices.
 * New code should use proper HTTP status codes instead.
 */
export type ApiResult<T> = ApiSuccess<T> | ApiError;

/**
 * Type for extracting the success data type from an ApiResult
 *
 * @example
 * type GetUserResult = ApiResult<User>
 * type UserData = ExtractApiData<GetUserResult> // User
 */
/**
 * Create a successful API result
 *
 * @example
 * return ctx.json(success(user), 200)
 *
 * @deprecated Use standard REST patterns instead. Return data directly.
 */
export function success<T>(data: T): ApiSuccess<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error API result
 *
 * @example
 * return ctx.json(
 *   error('NOT_FOUND', 'User not found', { userId }),
 *   404
 * )
 *
 * @deprecated Use standard REST patterns instead. Throw errors.
 */
export function error(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiError {
  return {
    success: false,
    code,
    message,
    details,
  };
}

/**
 * Type for extracting the success data type from an ApiResult
 *
 * @example
 * type GetUserResult = ApiResult<User>
 * type UserData = ExtractApiData<GetUserResult> // User
 */
export type ExtractApiData<T> = T extends { success: true; data: infer U } ? U : never;
