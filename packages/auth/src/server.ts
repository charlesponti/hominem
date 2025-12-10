import { UserAuthService } from '@hominem/data'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthConfig, ServerAuthResult, SupabaseAuthUser } from './types'
import { toHominemUser } from './user'

/**
 * Create Supabase server client for SSR
 */
export function createSupabaseServerClient(
  request: Request,
  config: AuthConfig
): { supabase: SupabaseClient; headers: Headers } {
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

    const supabaseUser = session.user as SupabaseAuthUser

    // Get or create Hominem user
    const userAuthData = await UserAuthService.findOrCreateUser(supabaseUser)
    if (!userAuthData) {
      return {
        user: null,
        supabaseUser: null,
        session: null,
        isAuthenticated: false,
      }
    }

    const hominemUser = toHominemUser(userAuthData)

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

export function getServerAuthConfig(): AuthConfig {
  let supabaseUrl: string | undefined
  let supabaseAnonKey: string | undefined

  // Define interface for import.meta.env to avoid 'any'
  interface ImportMetaEnv {
    VITE_SUPABASE_URL?: string
    SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
    SUPABASE_ANON_KEY?: string
  }

  // Try import.meta.env first (Vite/Client/Edge)
  const meta = import.meta as unknown as { env?: ImportMetaEnv }
  if (meta?.env) {
    supabaseUrl = meta.env.SUPABASE_URL || meta.env.VITE_SUPABASE_URL
    supabaseAnonKey = meta.env.SUPABASE_ANON_KEY || meta.env.VITE_SUPABASE_ANON_KEY
  }

  // Fallback to process.env (Node/Server)
  if ((!supabaseUrl || !supabaseAnonKey) && typeof process !== 'undefined' && process.env) {
    supabaseUrl = supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    supabaseAnonKey =
      supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

// Re-export for consumers importing from '@hominem/auth/server'
export { toHominemUser }
