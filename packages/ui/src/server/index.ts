/**
 * @deprecated This module is deprecated. Use '@hominem/auth/server' instead.
 * All authentication logic has been consolidated into the @hominem/auth package.
 */

import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type {
  SupabaseClient,
  Session as SupabaseSession,
  User as SupabaseUser,
} from '@supabase/supabase-js'

export interface AuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

/**
 * Get auth configuration from environment
 */
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
  // We use unknown cast first to avoid TS errors about ImportMeta not having env
  const meta = import.meta as unknown as { env?: ImportMetaEnv }
  if (typeof meta?.env !== 'undefined' && meta.env) {
    supabaseUrl = meta.env.SUPABASE_URL || meta.env.VITE_SUPABASE_URL
    supabaseAnonKey = meta.env.SUPABASE_ANON_KEY || meta.env.VITE_SUPABASE_ANON_KEY
  }

  // Fallback to process.env (Node/Server)
  // Use globalThis to access process without requiring @types/node
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
  if ((!supabaseUrl || !supabaseAnonKey) && proc?.env) {
    supabaseUrl = supabaseUrl || proc.env.SUPABASE_URL || proc.env.VITE_SUPABASE_URL
    supabaseAnonKey =
      supabaseAnonKey || proc.env.SUPABASE_ANON_KEY || proc.env.VITE_SUPABASE_ANON_KEY
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration: SUPABASE_URL and SUPABASE_ANON_KEY must be set'
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

/**
 * Create Supabase server client for SSR with proper cookie handling
 */
export function createSupabaseServerClient(
  request: Request,
  config: AuthConfig
): { supabase: SupabaseClient; headers: Headers } {
  const headers = new Headers()
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process
  const isProduction = proc?.env?.NODE_ENV === 'production'
  const requestUrl = new URL(request.url)
  const isSecure = requestUrl.protocol === 'https:'

  const supabase = createServerClient(config.supabaseUrl, config.supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '') as {
          name: string
          value: string
        }[]
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        for (const { name, value, options = {} } of cookiesToSet) {
          // Ensure cookies have proper attributes for persistence across deployments
          const cookieOptions = {
            // Preserve any existing options from Supabase (like maxAge, expires, etc.)
            ...options,
            // Override with required defaults to ensure cookies persist across deployments
            path: typeof options.path === 'string' ? options.path : '/',
            sameSite: (['lax', 'strict', 'none'].includes(String(options.sameSite))
              ? options.sameSite
              : 'lax') as 'lax' | 'strict' | 'none',
            // Only set secure in production or when using HTTPS
            secure: typeof options.secure === 'boolean' ? options.secure : isProduction || isSecure,
          }
          headers.append(
            'Set-Cookie',
            serializeCookieHeader(
              name,
              value,
              cookieOptions as Parameters<typeof serializeCookieHeader>[2]
            )
          )
        }
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
): Promise<{
  user: SupabaseUser | null
  session: SupabaseSession | null
  isAuthenticated: boolean
}> {
  const { supabase } = createSupabaseServerClient(request, config)

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return {
        user: null,
        session: null,
        isAuthenticated: false,
      }
    }

    return {
      user: session.user,
      session,
      isAuthenticated: true,
    }
  } catch (error) {
    console.error('Error in getServerAuth:', error)
    return {
      user: null,
      session: null,
      isAuthenticated: false,
    }
  }
}
