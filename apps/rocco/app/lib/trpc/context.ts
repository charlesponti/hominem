import { UserAuthService, type UserSelect } from '@hominem/data/user'
import { initTRPC, TRPCError } from '@trpc/server'
import { getServerAuth } from '../auth.server'
import { logger } from '../logger'

export interface Context {
  user?: UserSelect | null
  responseHeaders: Headers
}

export const createContext = async (request?: Request): Promise<Context> => {
  const responseHeaders = new Headers()

  if (!request) {
    return { user: null, responseHeaders }
  }

  // Test override for user
  if (process.env.NODE_ENV === 'test') {
    const testUserId = request.headers.get('x-user-id')
    if (testUserId) {
      const localUser = await UserAuthService.findByIdOrEmail({
        id: testUserId,
      })
      return { user: localUser ?? null, responseHeaders }
    }
  }

  try {
    const { user, headers } = await getServerAuth(request)

    // Copy auth headers (cookies) to response headers
    headers.forEach((value, key) => {
      responseHeaders.append(key, value)
    })

    // Map user to expected UserSelect type if present
    let mappedUser: UserSelect | null = null
    if (user) {
      mappedUser = {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        photoUrl:
          typeof (user as unknown as Record<string, unknown>).photoUrl === 'string'
            ? ((user as unknown as Record<string, unknown>).photoUrl as string)
            : null,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        birthday:
          typeof (user as unknown as Record<string, unknown>).birthday === 'string'
            ? ((user as unknown as Record<string, unknown>).birthday as string)
            : null,
        emailVerified:
          typeof (user as unknown as Record<string, unknown>).emailVerified === 'string'
            ? ((user as unknown as Record<string, unknown>).emailVerified as string)
            : null,
      }
    }
    return { user: mappedUser, responseHeaders }
  } catch (error) {
    logger.error('Error verifying auth token', { error: error as Error })
    return { user: null, responseHeaders }
  }
}

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to access this resource',
    })
  }
  return next({ ctx })
})

export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(isAdmin)
