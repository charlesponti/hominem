import { initTRPC, TRPCError } from '@trpc/server'
import type { HonoRequest } from 'hono'
import { getHominemUser } from '../middleware/supabase.js'

export interface Context {
  req: HonoRequest
}

const t = initTRPC.context<Context>().create()

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  const authHeader = ctx.req.header('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header',
    })
  }

  const token = authHeader.substring(7)
  const hominemUser = await getHominemUser(token)

  if (!hominemUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token or user not found' })
  }

  return next({
    ctx: {
      ...ctx,
      user: hominemUser,
      userId: hominemUser.id,
      supabaseId: hominemUser.supabaseId,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)
