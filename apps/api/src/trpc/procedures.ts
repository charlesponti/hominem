import type { HominemUser } from '@hominem/auth/server'
import { UserAuthService } from '@hominem/data'
import { initTRPC, TRPCError } from '@trpc/server'
import type { Queue } from 'bullmq'
import type { HonoRequest } from 'hono'
import { getHominemUser } from '../middleware/supabase.js'

export interface Context {
  req: HonoRequest
  queues: {
    plaidSync: Queue
    importTransactions: Queue
  }
  user?: HominemUser
  userId?: string
  supabaseId: string
}

const t = initTRPC.context<Context>().create()

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // If user is already authenticated by Hono middleware, use that
  if (ctx.user && ctx.userId && ctx.supabaseId) {
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        userId: ctx.userId,
        supabaseId: ctx.supabaseId,
      },
    })
  }

  // Test mode: use x-user-id header for authentication
  if (process.env.NODE_ENV === 'test') {
    const testUserId = ctx.req.header('x-user-id')
    if (testUserId) {
      // For test mode, get the user from the database
      try {
        const user = await UserAuthService.getUserById(testUserId)
        if (user) {
          // In test mode, we accept either existing supabaseId or use ID as fallback
          // This allows tests that create users without specific supabaseId to pass
          const supabaseId = user.supabaseId || user.id

          return next({
            ctx: {
              ...ctx,
              user,
              userId: user.id,
              supabaseId: supabaseId,
            },
          })
        }
      } catch (error) {
        console.error('Error getting user in test mode:', error)
      }
    }
  }

  // Fallback: use authorization header
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

  if (!hominemUser.supabaseId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User missing supabaseId' })
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
