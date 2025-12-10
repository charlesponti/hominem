import type { HominemUser, SupabaseAuthUser } from '@hominem/auth'
import { toHominemUser } from '@hominem/auth'
import { db, UserAuthService } from '@hominem/data'
import { users } from '@hominem/data/schema'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { setCookie } from 'hono/cookie'
import { env as appEnv } from '../lib/env.js'

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient
  }
}

export const getSupabase = (c: Context) => {
  return c.get('supabase')
}

export const getUser = (c: Context) => {
  return c.get('user')
}

export const getUserId = (c: Context) => {
  return c.get('userId')
}

export const getSupabaseId = (c: Context) => {
  return c.get('supabaseId')
}

// Service role client for admin operations
export const supabaseClient = createClient(appEnv.SUPABASE_URL, appEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function getHominemUser(
  tokenOrUser: string | SupabaseAuthUser
): Promise<HominemUser | null> {
  try {
    let supabaseUser: SupabaseAuthUser

    // If token is provided, validate it and get the user
    if (typeof tokenOrUser === 'string') {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser(tokenOrUser)

      if (error || !user) {
        return null
      }

      supabaseUser = user as SupabaseAuthUser
    } else {
      // If SupabaseUser object is provided, use it directly
      supabaseUser = tokenOrUser
    }

    // Use standardized service to find or create user
    const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)

    // Get the full user record from database
    const [user] = await db.select().from(users).where(eq(users.id, userAuthData.id))
    return user ? toHominemUser(user) : null
  } catch (error) {
    console.error('Error in getHominemUser:', error)
    return null
  }
}

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    // Test mode: use x-user-id header for authentication
    if (process.env.NODE_ENV === 'test') {
      const testUserId = c.req.header('x-user-id')
      if (testUserId) {
        c.set('userId', testUserId)
        // For test mode, also set the user object by querying the database
        try {
          const [user] = await db.select().from(users).where(eq(users.id, testUserId))
          if (user) {
            const hominemUser = toHominemUser(user)
            c.set('user', hominemUser)
            // Ensure supabaseId is set, defaulting to id if null (legacy behavior support)
            // But since we are migrating, it should ideally be equal
            c.set('supabaseId', hominemUser.supabaseId || hominemUser.id)
          }
        } catch (error) {
          console.error('Error getting user in test mode:', error)
        }
        await next()
        return
      }
    }

    const supabaseUrl = appEnv.SUPABASE_URL
    const supabaseAnonKey = appEnv.SUPABASE_ANON_KEY

    // Create SSR client for cookie-based auth (web apps)
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          const cookieHeader = c.req.header('Cookie') ?? ''
          const cookies = parseCookieHeader(cookieHeader)
          const filteredCookies = cookies.filter(
            (cookie): cookie is { name: string; value: string } => cookie.value !== undefined
          )
          return filteredCookies
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            if (options) {
              // Convert Supabase cookie options to Hono cookie options
              const honoCookieOptions = {
                domain: options.domain,
                expires: options.expires,
                httpOnly: options.httpOnly,
                maxAge: options.maxAge,
                path: options.path,
                secure: options.secure,
                sameSite: options.sameSite as
                  | 'Strict'
                  | 'Lax'
                  | 'None'
                  | 'strict'
                  | 'lax'
                  | 'none'
                  | undefined,
              }
              setCookie(c, name, value, honoCookieOptions)
            } else {
              setCookie(c, name, value)
            }
          }
        },
      },
    })

    c.set('supabase', supabase)

    // Try to get user from cookie session first (for web apps)
    try {
      const {
        data: { user: cookieUser },
        error: cookieError,
      } = await supabase.auth.getUser()

      if (!cookieError && cookieUser) {
        const hominemUser = await getHominemUser(cookieUser)
        if (hominemUser) {
          c.set('user', hominemUser)
          c.set('userId', hominemUser.id)
          c.set('supabaseId', cookieUser.id)
        }
      }
    } catch (error) {
      console.error('Error getting user from cookie:', error)
    }

    // If no user from cookie, try to get user from auth header (for API routes)
    // Use service role client for token validation
    if (!c.get('user')) {
      const authHeader = c.req.header('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const hominemUser = await getHominemUser(token)
          if (hominemUser) {
            c.set('user', hominemUser)
            c.set('userId', hominemUser.id)
            c.set('supabaseId', hominemUser.supabaseId)
          }
        } catch (error) {
          console.error('Error getting user from token:', error)
        }
      }
    }

    await next()
  }
}
