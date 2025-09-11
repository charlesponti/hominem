import { UserAuthService } from '@hominem/data'
import { createClient } from '@supabase/supabase-js'
import type { AuthConfig, HominemUser, ServerAuthResult } from './types'

/**
 * Create Supabase server client for SSR
 */
export function createSupabaseServerClient(request: Request, config: AuthConfig) {
  const headers = new Headers()

  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    },
  })

  return { supabase, headers }
}

/**
 * Get server-side authentication result
 */
export async function getServerAuth(
  request: Request,
  config: AuthConfig
): Promise<ServerAuthResult> {
  const { supabase } = createSupabaseServerClient(request, config)

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return {
        user: null,
        supabaseUser: null,
        session: null,
        isAuthenticated: false,
      }
    }

    const supabaseUser = session.user

    // Get or create Hominem user
    const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)

    const hominemUser: HominemUser = {
      id: userAuthData.id,
      email: userAuthData.email,
      name: userAuthData.name || undefined,
      image: userAuthData.image || undefined,
      supabaseId: userAuthData.supabaseId,
      isAdmin: userAuthData.isAdmin || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return {
      user: hominemUser,
      supabaseUser,
      session,
      isAuthenticated: true,
    }
  } catch (error) {
    console.error('Error in getServerAuth:', error)
    return {
      user: null,
      supabaseUser: null,
      session: null,
      isAuthenticated: false,
    }
  }
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireServerAuth(
  request: Request,
  config: AuthConfig
): Promise<{
  user: HominemUser
  supabaseUser: any
  session: any
}> {
  const auth = await getServerAuth(request, config)

  if (!auth.isAuthenticated || !auth.user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  return {
    user: auth.user,
    supabaseUser: auth.supabaseUser!,
    session: auth.session!,
  }
}

/**
 * Get auth configuration from environment
 */
export function getServerAuthConfig(): AuthConfig {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}
