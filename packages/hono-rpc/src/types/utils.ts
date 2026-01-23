/**
 * Shared type utilities for RPC types
 *
 * These utilities are used across all RPC type definitions to ensure
 * consistency and avoid duplication.
 */

/**
 * Converts Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 *
 * @example
 * type UserJson = JsonSerialized<User>
 * // { id: string; name: string; createdAt: string } (if User.createdAt is Date)
 */
export type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

/**
 * Type for endpoints that accept no input parameters
 * Use this instead of `object` for semantic clarity
 *
 * @example
 * export type GetAllInput = EmptyInput;
 */
export type EmptyInput = Record<string, never>;
