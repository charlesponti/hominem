import { createApiClientFromRaw, type ApiClient } from '../core/api-client'
import { createRawHonoClient } from '../core/raw-client'

export function createServerHonoClient(
  baseUrl: string,
  accessToken?: string,
  request?: Request,
): ApiClient {
  return createApiClientFromRaw(
    createRawHonoClient({
      baseUrl,
      getAuthToken: async () => accessToken ?? null,
      getHeaders: async () => {
        const cookieHeader = request?.headers.get('Cookie')
        return cookieHeader ? { cookie: cookieHeader } : {}
      },
      onError: (error) => {
        throw error
      },
    }),
  )
}
