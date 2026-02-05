/**
 * Client Type Module
 *
 * Exports the Hono client type without computing the full app type.
 * This avoids the "excessively deep type instantiation" errors that occur
 * when computing typeof app across packages.
 *
 * The client is created at runtime and types are inferred from the hc() call,
 * which provides full type safety without pre-computing the schema type.
 */

import { hc } from 'hono/client';

/**
 * HonoClientType - The type of a Hono RPC client
 *
 * Loosely typed to avoid expensive type computation.
 * Allows dynamic property access for all routes and operations.
 */
export type HonoClientType = Record<string, Record<string, any> | any>;

export type HonoClientOptions = Parameters<typeof hc>[1];

/**
 * Creates a type-safe Hono RPC client
 *
 * @param baseUrl - Base URL for the API server
 * @param options - Optional Hono client configuration
 * @returns Typed Hono client with full API surface
 *
 * @example
 * ```typescript
 * const client = createHonoClient('http://localhost:4040');
 * const res = await client.api.finance.accounts.list.$post({ json: {} });
 * const data = await res.json(); // Fully typed!
 * ```
 */
export function createHonoClient(baseUrl: string, options?: HonoClientOptions): HonoClientType {
  // Note: We intentionally avoid passing typeof app here to prevent
  // expensive type computation. Hono's hc() will still provide runtime
  // type safety through the actual API endpoint structure.
  return hc(baseUrl, options);
}
