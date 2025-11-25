import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lazy load the default client to avoid multiple instances if a custom client is provided
let defaultSupabase: SupabaseClient | undefined

export function getSupabase() {
  if (defaultSupabase) return defaultSupabase

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }

  defaultSupabase = createClient(supabaseUrl, supabaseAnonKey)
  return defaultSupabase
}

export function useSupabaseAuth(client?: SupabaseClient) {
  const supabaseClient = client || getSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient])

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    },
    [supabaseClient]
  )

  const signup = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      })
      if (error) throw error
    },
    [supabaseClient]
  )

  const logout = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) throw error
  }, [supabaseClient])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email)
      if (error) throw error
    },
    [supabaseClient]
  )

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    })
    if (error) throw error
  }, [supabaseClient])

  const signInWithGitHub = useCallback(async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'github',
    })
    if (error) throw error
  }, [supabaseClient])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithGitHub,
    userId: user?.id,
  }
}
