import type { AuthError, Session, User } from '@supabase/supabase-js'
import { useState } from 'react'
import { supabase } from './client'

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string } | null>(null)

  const handleAuthError = (error: AuthError) => {
    setError({ message: error.message })
    setIsLoading(false)
    return { error, user: null, session: null }
  }

  const clearError = () => setError(null)

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true)
      clearError()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // options: {
        //   redirectTo: `${window.location.origin}/auth`,
        // },
      })

      if (error) return handleAuthError(error)

      // OAuth redirects to Google, so we'll only get here
      // if there's an error or if the user returns from the OAuth flow
      setIsLoading(false)
      return { data, error: null }
    } catch (err) {
      return handleAuthError(err as AuthError)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      clearError()

      const { error } = await supabase.auth.signOut()

      if (error) return handleAuthError(error)

      setUser(null)
      setSession(null)
      setIsLoading(false)
      return { error: null }
    } catch (err) {
      return handleAuthError(err as AuthError)
    }
  }

  const getSession = async () => {
    try {
      setIsLoading(true)
      clearError()

      const { data, error } = await supabase.auth.getSession()

      if (error) return handleAuthError(error)

      setUser(data.session?.user || null)
      setSession(data.session)
      setIsLoading(false)
      return {
        user: data.session?.user || null,
        session: data.session,
        error: null,
      }
    } catch (err) {
      return handleAuthError(err as AuthError)
    }
  }

  return {
    user,
    session,
    isLoading,
    error,
    isAuthenticated: !!user && !!session,
    loginWithGoogle,
    logout,
    getSession,
    clearError,
  }
}
