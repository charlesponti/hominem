import { db, UserAuthService, type UserAuthData } from '@hominem/data'
import { users } from '@hominem/data/schema'
import { initTRPC, TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { createSupabaseServerClient } from '../supabase/server'

// Define the context shape for React Router (Request-based)
export interface Context {
  user?: typeof users.$inferSelect
  userId?: string
  supabaseId?: string
}

// Initialize tRPC
const t = initTRPC.context<Context>().create()

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

// Middleware to check if user is authenticated
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      userId: ctx.userId,
      supabaseId: ctx.supabaseId || '',
    },
  })
})

// Export protected procedures
export const protectedProcedure = t.procedure.use(isAuthed)

// Create context from Request (for React Router)
export async function createContext(request?: Request): Promise<Context> {
  if (!request) {
    return {}
  }

  try {
    // Test mode: use x-user-id header for authentication
    if (process.env.NODE_ENV === 'test') {
      const testUserId = request.headers.get('x-user-id')
      if (testUserId) {
        try {
          const [user] = await db.select().from(users).where(eq(users.id, testUserId))
          if (user) {
            if (!user.supabaseId) {
              throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User missing supabaseId' })
            }
            return {
              user,
              userId: user.id,
              supabaseId: user.supabaseId,
            }
          }
        } catch (error) {
          console.error('Error getting user in test mode:', error)
        }
      }
    }

    // Try cookie-based auth first (for web app requests)
    // Use getUser() instead of getSession() for security - getUser() validates with Supabase server
    const { supabase } = createSupabaseServerClient(request)

    // Log cookies for debugging
    const cookieHeader = request.headers.get('Cookie')
    console.log('Context creation - Cookie header present:', !!cookieHeader)

    const {
      data: { user: cookieUser },
      error: cookieError,
    } = await supabase.auth.getUser()

    console.log('Context creation - Cookie auth result:', {
      hasUser: !!cookieUser,
      userId: cookieUser?.id,
      error: cookieError?.message,
    })

    let supabaseUser = !cookieError ? cookieUser : undefined

    // If no session, try Bearer token auth
    if (!supabaseUser) {
      const authHeader = request.headers.get('authorization')
      console.log('Context creation - Bearer token check:', {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer '),
      })

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)

        // For Bearer token validation, use getUser() with the token parameter
        // The server client can validate tokens this way
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token)

        console.log('Context creation - Bearer token auth result:', {
          hasUser: !!user,
          userId: user?.id,
          error: error?.message,
        })

        if (!error && user) {
          supabaseUser = user
        }
      }
    }

    if (!supabaseUser) {
      console.log('Context creation - No supabaseUser found, returning empty context')
      return {}
    }

    console.log('Context creation - Found supabaseUser:', {
      id: supabaseUser.id,
      email: supabaseUser.email,
    })

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error(
        'DATABASE_URL environment variable is not set. Authentication requires database access.'
      )
      return {}
    }

    // Log DATABASE_URL (masked for security) for debugging
    const dbUrl = process.env.DATABASE_URL
    const maskedUrl = dbUrl
      ? dbUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1***$3') // Mask password in connection string
      : 'not set'
    console.log('DATABASE_URL:', maskedUrl)

    // Use standardized service to find or create user
    // Wrap in try-catch to handle database connection errors gracefully
    console.log('Context creation - Attempting to find or create user in database')
    let userAuthData: UserAuthData | undefined
    try {
      userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)
      console.log('Context creation - User found/created:', {
        userId: userAuthData.id,
        email: userAuthData.email,
      })
    } catch (dbError) {
      console.log('Context creation - Database error in findOrCreateUser')

      // Extract full error details including nested causes
      const errorDetails: Record<string, unknown> = {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        supabaseId: supabaseUser.id,
      }

      if (dbError instanceof Error) {
        if ('cause' in dbError && dbError.cause) {
          errorDetails.cause =
            dbError.cause instanceof Error ? dbError.cause.message : String(dbError.cause)
          if (dbError.cause instanceof Error && 'code' in dbError.cause) {
            errorDetails.causeCode = dbError.cause.code
          }
          // Log the full cause object for debugging
          errorDetails.causeFull = dbError.cause
        }
        if ('code' in dbError) {
          errorDetails.code = dbError.code
        }
        if ('name' in dbError) {
          errorDetails.name = dbError.name
        }
        if ('stack' in dbError) {
          errorDetails.stack = dbError.stack
        }
      }

      // Check if it's a database connection error
      const isConnectionError =
        dbError instanceof Error &&
        ('code' in dbError ||
          dbError.message.includes('ECONNREFUSED') ||
          dbError.message.includes('connect') ||
          dbError.message.includes('Failed to find or create user'))

      if (isConnectionError) {
        console.error('Database connection error in context creation:', {
          ...errorDetails,
          hint:
            errorDetails.code === 'ECONNREFUSED'
              ? 'Database server is not running or DATABASE_URL is incorrect. Check your database connection.'
              : 'Check DATABASE_URL environment variable and ensure database is accessible.',
        })
      } else {
        console.error('Error finding or creating user:', errorDetails)
      }
      // Return unauthenticated context if database is unavailable
      return {}
    }

    // Get the full user record from database
    console.log('Context creation - Fetching full user record from database')
    let user: typeof users.$inferSelect | undefined
    try {
      const [foundUser] = await db.select().from(users).where(eq(users.id, userAuthData.id))
      if (!foundUser) {
        console.warn('Context creation - User not found after creation:', {
          userId: userAuthData.id,
        })
        return {}
      }
      user = foundUser
      console.log('Context creation - User record fetched successfully:', {
        userId: user.id,
        email: user.email,
        supabaseId: user.supabaseId,
      })
    } catch (dbError) {
      const isConnectionError =
        dbError instanceof Error &&
        ('code' in dbError ||
          dbError.message.includes('ECONNREFUSED') ||
          dbError.message.includes('connect'))

      if (isConnectionError) {
        console.error('Database connection error when fetching user:', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          userId: userAuthData.id,
        })
      } else {
        console.error('Error fetching user from database:', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          userId: userAuthData.id,
        })
      }
      return {}
    }

    const context = {
      user,
      userId: user.id,
      supabaseId: user.supabaseId || '',
    }
    console.log('Context creation - Successfully created context:', {
      userId: context.userId,
      supabaseId: context.supabaseId,
      hasUser: !!context.user,
    })
    return context
  } catch (error) {
    console.error('Context creation - Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {}
  }
}

// Create context adapter for Hono (used by API)
export function createHonoContextAdapter(honoContext: {
  user?: typeof users.$inferSelect
  userId?: string
  supabaseId?: string
}): Context {
  return {
    user: honoContext.user,
    userId: honoContext.userId,
    supabaseId: honoContext.supabaseId || '',
  }
}
