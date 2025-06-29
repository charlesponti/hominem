import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../../packages/types/trpc'
import { getValidAccessToken } from '../utils/auth-utils'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4040/trpc',
      async headers() {
        const token = await getValidAccessToken()
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})
