import { createApiClientFromRaw, type ApiClient } from '../core/api-client'
import { createRawHonoClient } from '../core/raw-client'

export function createServerClient(
  baseUrl: string,
  accessToken?: string,
  request?: Request,
): ApiClient {
  const cookieHeader = request?.headers.get('Cookie') ?? request?.headers.get('cookie') ?? null

  return createApiClientFromRaw(
    createRawHonoClient({
      baseUrl,
      getAuthToken: async () => (cookieHeader ? null : accessToken ?? null),
      getHeaders: async () => {
        return cookieHeader ? { cookie: cookieHeader } : {}
      },
      onError: (error) => {
        throw error
      },
    }),
  )
}

export const createServerHonoClient = createServerClient
