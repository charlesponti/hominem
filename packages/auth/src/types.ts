import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'

/**
 * Canonical user profile stored/used in Hominem apps.
 * All apps should treat this as the source-of-truth shape.
 */
export interface HominemUser {
  id: string
  email: string
  name?: string | undefined
  image?: string | undefined
  supabaseId: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Metadata we expect to receive from Supabase (user_metadata + app_metadata).
 * Optional by design; helpers will normalize missing fields.
 */
export type AuthUserMetadata = {
  avatar_url?: string
  full_name?: string
  display_name?: string
  name?: string
  picture?: string
  image?: string
  first_name?: string
  last_name?: string
  isAdmin?: boolean
  is_admin?: boolean
}

export type AuthAppMetadata = {
  isAdmin?: boolean
  is_admin?: boolean
}

/**
 * Supabase user shape annotated with normalized metadata typing.
 * Use this instead of the raw SupabaseUser when working with auth flows.
 */
export type SupabaseAuthUser = SupabaseUser & {
  user_metadata: AuthUserMetadata
  app_metadata: AuthAppMetadata
}

export type SupabaseAuthSession = SupabaseSession & {
  user: SupabaseAuthUser
}

export interface AuthContextType {
  // User state
  user: HominemUser | null
  supabaseUser: SupabaseAuthUser | null
  session: SupabaseAuthSession | null
  isLoading: boolean
  isAuthenticated: boolean

  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string) => Promise<{ error?: Error }>
  signInWithOAuth: (provider: 'apple' | 'google' | 'github' | 'discord') => Promise<{ error?: Error }>
  signOut: () => Promise<{ error?: Error }>
  resetPassword: (email: string) => Promise<{ error?: Error }>

  // Utility methods
  refreshUser: () => Promise<void>
}

export interface AuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  redirectTo?: string
}

export interface ServerAuthResult {
  user: HominemUser | null
  session: SupabaseAuthSession | null
  isAuthenticated: boolean
}
