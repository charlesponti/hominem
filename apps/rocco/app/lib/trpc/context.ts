import { randomUUID } from 'node:crypto'
import { users } from '@hominem/data/schema'
import type { User } from '@supabase/supabase-js'
import { initTRPC, TRPCError } from '@trpc/server'
import { db } from '../../db'
import { createClient } from '../../lib/supabase/server'
import { logger } from '../logger'
import { cacheKeys, cacheUtils } from '../redis'

// Define the context shape
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

// Cache TTL constants
const TOKEN_CACHE_TTL = 1 * 60 // 1 minute

// Optimized token validation with Redis caching
async function validateTokenWithCache(request: Request) {
  // First try to get token from Authorization header (client-side tRPC)
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')

    // Try to get from cache first
    const cacheKey = cacheKeys.token(token)
    const cachedToken = await cacheUtils.get<User>(cacheKey)

    if (cachedToken) {
      return cachedToken
    }

    // Create Supabase client for server-side auth verification
    const { supabase } = createClient(request)

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token)

      if (error || !user) {
        return null
      }

      // Cache the token validation result
      await cacheUtils.set(cacheKey, user, TOKEN_CACHE_TTL)

      return user
    } catch (error) {
      logger.error('Error validating token', { error: error as Error })
      return null
    }
  }

  // If no Authorization header, try to get user from Supabase session cookies (server-side)
  const { supabase } = createClient(request)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    logger.error('Error getting user from session', { error: error as Error })
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

    // Validate token with caching
    const supabaseUser = await validateTokenWithCache(request)

    if (!supabaseUser) {
      return { db }
    }

    // Get or create user in our own database
    let localUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.supabaseId, supabaseUser.id),
    })

    if (!localUser) {
      try {
        ;[localUser] = await db
          .insert(users)
          .values({
            id: randomUUID(),
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
            supabaseId: supabaseUser.id,
          })
          .returning()
        logger.info('New user created in local DB', { userId: localUser.id })
      } catch (dbError) {
        logger.error('Failed to create user in local DB', {
          error: dbError as Error,
          supabaseId: supabaseUser.id,
        })
        // Still return a context, but without a user, so the request is unauthenticated
        return { db }
      }
    }

    logger.debug('User authenticated', {
      userId: localUser.id,
      email: localUser.email,
    })

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

// Cache management utilities
export const clearTokenCache = async (token?: string) => {
  if (token) {
    await cacheUtils.del(cacheKeys.token(token))
  } else {
    // Clear all token cache keys (use with caution)
    console.warn('Clearing all token cache - this is expensive in production')
  }
}

// Cache statistics utility
export const getCacheStats = async () => {
  return await cacheUtils.getStats()
}
