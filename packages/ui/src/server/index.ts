import {
  createClient,
  type Session as SupabaseSession,
  type User as SupabaseUser,
  type SupabaseClient,
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
  if (typeof meta !== 'undefined' && meta.env) {
    supabaseUrl = meta.env.SUPABASE_URL || meta.env.VITE_SUPABASE_URL
    supabaseAnonKey = meta.env.SUPABASE_ANON_KEY || meta.env.VITE_SUPABASE_ANON_KEY
  }

  // Fallback to process.env (Node/Server)
  // Use explicit type casting for process to avoid TS errors without @types/node
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  // @ts-expect-error
  const proc = typeof process !== 'undefined' ? (process as any) : undefined
  if ((!supabaseUrl || !supabaseAnonKey) && proc && proc.env) {
    supabaseUrl = supabaseUrl || proc.env.SUPABASE_URL || proc.env.VITE_SUPABASE_URL
    supabaseAnonKey =
      supabaseAnonKey || proc.env.SUPABASE_ANON_KEY || proc.env.VITE_SUPABASE_ANON_KEY
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

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
