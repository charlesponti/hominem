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
 */

import type { ErrorCode } from './errors';

/**
 * Successful API response
 *
 * @template T The type of data being returned
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
 */
export interface ApiError {
  success: false;
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
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
 */
export type ApiResult<T> = ApiSuccess<T> | ApiError;

/**
 * Create a successful API result
 *
 * @example
 * return ctx.json(success(user), 200)
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
export type ExtractApiData<T> = T extends ApiResult<infer U> ? U : never;
