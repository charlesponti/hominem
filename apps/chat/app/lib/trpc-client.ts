import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from './trpc/routers/index'

export const trpc = createTRPCReact<AppRouter>()

export const createTRPCClient = () => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
      }),
    ],
  })
}
