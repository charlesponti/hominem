import { UserAuthService } from '@hominem/data'
import { users } from '@hominem/data/schema'
import { initTRPC, TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { createClient } from '../../lib/supabase/server'
import { logger } from '../logger'

export interface Context {
  db: typeof db
  user?: {
    id: string
    email: string
    name?: string
    avatar?: string
    isAdmin?: boolean
    supabaseId: string | null
  }
}

function extractBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return null
  }
  const token = authHeader.slice('bearer '.length).trim()
  return token.length ? token : null
}

// Validate token directly via Supabase (no Redis caching) to mirror Notes behavior
async function validateToken(request: Request) {
  const token = extractBearerToken(request)
  const { supabase } = createClient(request)

  try {
    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)

      if (error || !user) {
        return null
      }

      return user
    }

    // If no Authorization header, try to get user from Supabase session cookies (server-side)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    logger.error('Error validating token', { error: error as Error })
    return null
  }
}

export const createContext = async (request?: Request): Promise<Context> => {
  if (!request) {
    return { db }
  }

  try {
    // Test mode: use x-user-id header for authentication
    if (process.env.NODE_ENV === 'test') {
      const testUserId = request.headers.get('x-user-id')
      if (testUserId) {
        // For test mode, get the user from the database
        try {
          const localUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, testUserId),
          })
          if (localUser) {
            return {
              db,
              user: {
                id: localUser.id,
                email: localUser.email,
                name: localUser.name || undefined,
                avatar: undefined,
                isAdmin: false,
                supabaseId: localUser.supabaseId,
              },
            }
          }
        } catch (error) {
          logger.error('Error getting user in test mode:', { error: error as Error })
        }
      }
    }

    // Validate token (no caching)
    const supabaseUser = await validateToken(request)

    if (!supabaseUser) {
      return { db }
    }

    // Use standardized service to find or create user
    let localUser: typeof users.$inferSelect
    try {
      const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)

      // Get the full user record from database
      const [user] = await db.select().from(users).where(eq(users.id, userAuthData.id))
      if (!user) {
        throw new Error('User not found after creation')
      }

      localUser = user
    } catch (dbError) {
      logger.error('Failed to find or create user in local DB', {
        error: dbError as Error,
        supabaseId: supabaseUser.id,
      })
      // Still return a context, but without a user, so the request is unauthenticated
      return { db }
    }

    // Return context with user information from our database
    return {
      db,
      user: {
        id: localUser.id,
        email: localUser.email,
        name: localUser.name || undefined,
        avatar: supabaseUser.user_metadata?.avatar_url,
        isAdmin: supabaseUser.user_metadata?.isAdmin || false,
        supabaseId: localUser.supabaseId,
      },
    }
  } catch (error) {
    logger.error('Error verifying auth token', { error: error as Error })
    return { db }
  }
}

// Initialize tRPC
const t = initTRPC.context<Context>().create()

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

// Middleware to check if user is authenticated
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

// Middleware to check if user is admin
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
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

// Export protected procedures
export const protectedProcedure = t.procedure.use(isAuthed)
export const adminProcedure = t.procedure.use(isAdmin)
