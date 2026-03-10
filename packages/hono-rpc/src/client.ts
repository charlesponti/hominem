/**
 * Client Type Module
 *
 * Exports a lightweight Hono client type without computing the full app type.
 */
import { hc } from 'hono/client'

import type { AppType } from './app.type'

export type HonoClientOptions = Parameters<typeof hc>[1]

function buildClient(baseUrl: string, options?: HonoClientOptions) {
  return hc<AppType>(baseUrl, options)
}

export type HonoClientType = ReturnType<typeof buildClient>

/**
 * Creates a type-safe Hono RPC client
 *
 * @param baseUrl - Base URL for the API server
 * @param options - Optional Hono client configuration
 * @returns Typed Hono client with full API surface
 *
 * @example
 * ```typescript
 * const client = createHonoClient('http://localhost:4040')
 * const res = await client.api.finance.accounts.list.$post({ json: {} })
 * const data = await res.json() // typed as unknown
 * ```
 */
export function createHonoClient(baseUrl: string, options?: HonoClientOptions): HonoClientType {
  return buildClient(baseUrl, options)
}
