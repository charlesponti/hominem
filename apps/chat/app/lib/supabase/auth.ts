import type { User } from '@supabase/supabase-js'
import { createClient } from './client'

export interface AuthState {
  user: User | null
  isLoading: boolean
}

// Get the current user session
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') return null

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user
}

// Sign in with Google
export async function signInWithGoogle(): Promise<void> {
  if (typeof window === 'undefined') return

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  })
  if (error) throw error
}

// Sign out
export async function signOut(): Promise<void> {
  if (typeof window === 'undefined') return

  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
