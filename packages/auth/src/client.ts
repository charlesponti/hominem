import { createClient } from '@supabase/supabase-js'
import type { AuthConfig, HominemUser } from './types'

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
 * Convert Supabase user to Hominem user (client-side only)
 * This creates a basic user object without database interaction
 */
export function createHominemUserFromSupabase(supabaseUser: any): HominemUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || undefined,
    image:
      supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || undefined,
    supabaseId: supabaseUser.id,
    isAdmin: false, // Will be updated by server-side auth
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    updatedAt: supabaseUser.updated_at || new Date().toISOString(),
  }
}

/**
 * Get auth configuration from environment
 */
export function getAuthConfig(): AuthConfig {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  }
}
