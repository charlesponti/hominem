import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from './client'

export function useSupabaseAuth() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    },
    [supabase.auth]
  )

  const signup = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
    },
    [supabase.auth]
  )

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [supabase.auth])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    },
    [supabase.auth]
  )

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  }, [supabase.auth])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }, [supabase.auth])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    userId: user?.id,
    getUser,
    signInWithGoogle,
    supabase,
  }
}
