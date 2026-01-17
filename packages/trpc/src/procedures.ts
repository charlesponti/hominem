import type { HominemUser } from '@hominem/auth/server'
import type { Queues } from '@hominem/services/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { initTRPC, TRPCError } from '@trpc/server'
import type { HonoRequest } from 'hono'

export interface Context {
  req: HonoRequest
  queues: Queues
  user?: HominemUser
  userId?: string
  supabaseId: string
  supabase?: SupabaseClient
}

const t = initTRPC.context<Context>().create()

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!(ctx.user && ctx.userId)) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userId: ctx.userId,
      supabaseId: ctx.supabaseId,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)
