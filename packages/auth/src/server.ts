import { UserAuthService } from '@hominem/services/user'
import { logger } from '@hominem/utils/logger'
import {
  type CookieMethodsServer,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthConfig, ServerAuthResult, SupabaseAuthUser } from './types'
import { toHominemUser } from './user'

/**
 * Creates cookie handling utilities for server-side Supabase client.
 * Returns headers and cookie methods that work together.
 */
function createCookieHandlers(request: Request): {
  headers: Headers
  cookies: CookieMethodsServer
} {
  const headers = new Headers()
  const cookies: CookieMethodsServer = {
    getAll() {
      return parseCookieHeader(request.headers.get('Cookie') ?? '').filter(
        (cookie): cookie is { name: string; value: string } => cookie.value !== undefined
      )
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options = {} }) => {
        headers.append('Set-Cookie', serializeCookieHeader(name, value, { ...options, path: '/' }))
      })
    },
  }
  return { headers, cookies }
}

export async function getServerAuth(
  request: Request,
  config: AuthConfig
): Promise<ServerAuthResult & { headers: Headers }> {
  if (!request.headers) {
    throw new Error('Invalid request')
  }

  const { headers, cookies } = createCookieHandlers(request)

  const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, { cookies })

  try {
    // Always verify user with Supabase Auth server
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        headers,
      }
    }

    // Get or create Hominem user
    const userAuthData = await UserAuthService.findOrCreateUser({ ...user, email: user.email ?? '' })
    if (!userAuthData) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
        headers,
      }
    }

    // Fetch session for access token if needed
    const {
      data: { session },
    } = await supabase.auth.getSession()

    return {
      user: toHominemUser(userAuthData),
      session,
      isAuthenticated: true,
      headers,
    }
  } catch (error) {
    logger.error('[getServerAuth]:', { error })
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      headers,
    }
  }
}

/**
 * Creates a Supabase server client with cookie handling.
 * Returns the client and headers for cookie management.
 */
export function createSupabaseServerClient(
  request: Request,
  config: AuthConfig
): { supabase: SupabaseClient; headers: Headers } {
  if (!request.headers) {
    throw new Error('Invalid request')
  }

  const { headers, cookies } = createCookieHandlers(request)

  const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, { cookies })

  return { supabase, headers }
}

// Re-export for consumers importing from '@hominem/auth/server'
export { toHominemUser }
