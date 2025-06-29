import { initTRPC } from '@trpc/server'

export interface Context {
  user?: {
    id: string
    email?: string
  }
  userId?: string
}

const t = initTRPC.context<Context>().create()

const authMiddleware = t.middleware(async ({ ctx, next }) => {
  // For now, we'll use a simple context without authentication
  // This can be enhanced later with proper auth middleware
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userId: ctx.userId,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)
