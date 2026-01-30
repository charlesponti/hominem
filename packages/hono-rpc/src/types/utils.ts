/**
 * Shared type utilities for RPC types
 *
 * These utilities are used across all RPC type definitions to ensure
 * consistency and avoid duplication.
 */

/**
 * Type for endpoints that accept no input parameters
 * Use this instead of `object` for semantic clarity
 *
 * @example
 * export type GetAllInput = EmptyInput;
 */
export type EmptyInput = Record<string, never>;
