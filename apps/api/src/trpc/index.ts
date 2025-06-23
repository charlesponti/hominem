import { initTRPC, TRPCError } from '@trpc/server'
import type { HonoRequest } from 'hono'
import { getHominemUser, supabaseClient } from '../middleware/auth'

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
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser(token)
  if (error || !user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid token' })
  }
  const hominemUser = await getHominemUser(user.id)
  if (!hominemUser) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
  }
  return next({
    ctx: {
      ...ctx,
      user: hominemUser,
      userId: hominemUser.id,
      supabaseId: user.id,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)
