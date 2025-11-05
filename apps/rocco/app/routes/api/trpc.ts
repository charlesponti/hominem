import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { logger } from '../../lib/logger'
import { createContext } from '../../lib/trpc/context'
import { appRouter } from '../../lib/trpc/router'
import type { Route } from './+types/trpc'

export const loader = ({ request }: Route.LoaderArgs) => {
  const startTime = Date.now()

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: async (opts) => createContext(opts.req),
    onError: ({ path, error, type, ctx }) => {
      const duration = Date.now() - startTime
      const context = {
        path: path ?? '<no-path>',
        type,
        duration,
        userId: ctx?.user?.id,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      }

      logger.logTRPCError(error, context)
    },
  })
}

export const action = ({ request }: Route.ActionArgs) => {
  const startTime = Date.now()

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: async (opts) => createContext(opts.req),
    onError: ({ path, error, type, ctx }) => {
      const duration = Date.now() - startTime
      const context = {
        path: path ?? '<no-path>',
        type,
        duration,
        userId: ctx?.user?.id,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      }

      logger.logTRPCError(error, context)
    },
  })
}
