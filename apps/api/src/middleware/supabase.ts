import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { setCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'
import { env as appEnv } from '../lib/env.js'

declare module 'hono' {
  interface ContextVariableMap {
    supabase: SupabaseClient
    user?: typeof users.$inferSelect
    userId?: string | null
    supabaseId?: string | null
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
  tokenOrUser: string | SupabaseUser
): Promise<typeof users.$inferSelect | null> {
  try {
    let supabaseUser: SupabaseUser

    // If token is provided, validate it and get the user
    if (typeof tokenOrUser === 'string') {
      const {
        data: { user },
        error,
      } = await supabaseClient.auth.getUser(tokenOrUser)

      if (error || !user) {
        return null
      }

      supabaseUser = user
    } else {
      // If SupabaseUser object is provided, use it directly
      supabaseUser = tokenOrUser
    }

    // Find existing user or create new one
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseUser.id))
    if (user) {
      return user
    }

    const [newUser] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: supabaseUser.email || '',
        supabaseId: supabaseUser.id,
      })
      .returning()

    return newUser
  } catch (error) {
    console.error('Error in getHominemUser:', error)
    return null
  }
}

export const supabaseMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
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
