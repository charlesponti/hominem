/**
 * Client Type Module
 *
 * Exports the Hono client type computed directly from AppType.
 * This file lives in hono-rpc (not hono-client) to ensure TypeScript
 * computes the type in the same package where AppType is defined,
 * avoiding cross-package type depth limits.
 */

import { hc } from 'hono/client';
import type { AppType } from './app.type';

/**
 * HonoClientType - The type of a Hono RPC client
 *
 * This is the canonical type for type-safe Hono clients throughout the monorepo.
 * Import from @hominem/hono-rpc/client for server-side usage,
 * or @hominem/hono-client for React/hook-based usage.
 *
 * Extracts the return type of hc<AppType> directly, which captures
 * all API routes and methods with full type safety.
 */
export type HonoClientType = ReturnType<typeof hc<AppType>>;

export type HonoClientOptions = Parameters<typeof hc>[1];

export function createHonoClient(baseUrl: string, options?: HonoClientOptions): HonoClientType {
  return hc<AppType>(baseUrl, options);
}
