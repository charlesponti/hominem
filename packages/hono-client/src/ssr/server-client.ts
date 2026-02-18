import type { HonoClientInstance } from '../core/client'

import { createHonoClient } from '@hominem/hono-rpc/client'

export function createServerHonoClient(
  baseUrl: string,
  accessToken?: string,
  request?: Request,
): HonoClientInstance {
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`
  }
  const cookieHeader = request?.headers.get('Cookie')
  if (cookieHeader) {
    headers.cookie = cookieHeader
  }

  return createHonoClient(baseUrl, { headers }) as HonoClientInstance
}
