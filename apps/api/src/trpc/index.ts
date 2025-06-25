import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { initTRPC, TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import type { HonoRequest } from 'hono'
import { getHominemUser } from '../middleware/supabase.js'

export interface Context {
  req: HonoRequest
}

const t = initTRPC.context<Context>().create()

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // Test mode: use x-user-id header for authentication
  if (process.env.NODE_ENV === 'test') {
    const testUserId = ctx.req.header('x-user-id')
    if (testUserId) {
      // For test mode, get the user from the database
      try {
        const [user] = await db.select().from(users).where(eq(users.id, testUserId))
        if (user) {
          return next({
            ctx: {
              ...ctx,
              user,
              userId: user.id,
              supabaseId: user.supabaseId,
            },
          })
        }
      } catch (error) {
        console.error('Error getting user in test mode:', error)
      }
    }
  }

  // Production mode: use authorization header
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
