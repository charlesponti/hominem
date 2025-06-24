import { createClient } from '@supabase/supabase-js'
import { initTRPC, TRPCError } from '@trpc/server'
import type { HonoRequest } from 'hono'
import { env } from '../lib/env.js'

export interface Context {
  req: HonoRequest
}

const t = initTRPC.context<Context>().create()

// Service role client for tRPC auth
const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

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

  // Import the getHominemUser function from the new middleware
  const { getHominemUser } = await import('../middleware/supabase.js')
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
