import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../../packages/types/trpc'
import { getValidAccessToken } from '../utils/auth-utils'

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:4040/trpc',
      async headers() {
        const token = await getValidAccessToken()
        if (!token) {
          throw new Error('No token found. Please run `hominem auth` to authenticate.')
        }
        return {
          authorization: token ? `Bearer ${token}` : '',
        }
      },
    }),
  ],
})
