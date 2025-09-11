import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'

export interface HominemUser {
  id: string
  email: string
  name?: string
  image?: string
  supabaseId: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthContextType {
  // User state
  user: HominemUser | null
  supabaseUser: SupabaseUser | null
  session: SupabaseSession | null
  isLoading: boolean
  isAuthenticated: boolean

  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string) => Promise<{ error?: Error }>
  signInWithOAuth: (provider: 'google' | 'github' | 'discord') => Promise<{ error?: Error }>
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
  supabaseUser: SupabaseUser | null
  session: SupabaseSession | null
  isAuthenticated: boolean
}
