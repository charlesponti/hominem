import { createClient } from '@supabase/supabase-js'
import type { AuthConfig } from './types'
export { createHominemUserFromSupabase } from './user'

/**
 * Create Supabase client for client-side auth
 */
export function createSupabaseClient(config: AuthConfig) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

/**
 * Get auth configuration from environment
 */
export function getAuthConfig(): AuthConfig {
  let supabaseUrl: string | undefined
  let supabaseAnonKey: string | undefined

  // Define interface for import.meta.env to avoid 'any'
  interface ImportMetaEnv {
    VITE_SUPABASE_URL?: string
    SUPABASE_URL?: string
    VITE_SUPABASE_ANON_KEY?: string
    SUPABASE_ANON_KEY?: string
  }

  // Try import.meta.env first (Vite/Client)
  // We use unknown cast first to avoid TS errors about ImportMeta not having env
  const meta = import.meta as unknown as { env?: ImportMetaEnv }
  if (typeof meta !== 'undefined' && meta.env) {
    supabaseUrl = meta.env.VITE_SUPABASE_URL || meta.env.SUPABASE_URL
    supabaseAnonKey = meta.env.VITE_SUPABASE_ANON_KEY || meta.env.SUPABASE_ANON_KEY
  }

  // Fallback to process.env (Node/Server or compatible bundlers)
  if ((!supabaseUrl || !supabaseAnonKey) && typeof process !== 'undefined' && process.env) {
    supabaseUrl = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    supabaseAnonKey =
      supabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Missing Supabase environment variables', { supabaseUrl, supabaseAnonKey })
    throw new Error('Missing Supabase environment variables')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  }
}
