import { hc } from 'hono/client'

import type { AppType } from './app.type'

export type HonoClientOptions = Parameters<typeof hc>[1]

function buildClient(baseUrl: string, options?: HonoClientOptions) {
  return hc<AppType>(baseUrl, options)
}

export type RpcTransportClient = ReturnType<typeof buildClient>
export type HonoClientType = RpcTransportClient

export function createTransportClient(baseUrl: string, options?: HonoClientOptions): RpcTransportClient {
  return buildClient(baseUrl, options)
}

export function createClient(baseUrl: string, options?: HonoClientOptions): RpcTransportClient {
  return createTransportClient(baseUrl, options)
}

export const createHonoClient = createClient
