import { createBrowserClient } from '@supabase/ssr'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Lazy load the default client to avoid multiple instances
let defaultSupabase: SupabaseClient | undefined

export function getSupabase() {
  if (defaultSupabase) return defaultSupabase

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }

  defaultSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return defaultSupabase
}

export function useSupabaseAuth() {
  const supabaseClient = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getInitialSession = useCallback(async () => {
    const {
      data: { session: initialSession },
    } = await supabaseClient.auth.getSession()
    setSession(initialSession)
    setIsLoading(false)
  }, [supabaseClient])

  useEffect(() => {
    getInitialSession()

    // Listen for auth changes - Supabase manages session state internally
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [getInitialSession, supabaseClient])

  const getUser = useCallback(async () => {
    const {
      data: { user: currentUser },
      error,
    } = await supabaseClient.auth.getUser()
    if (error) throw error
    return currentUser ?? null
  }, [supabaseClient])

  const logout = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) throw error
  }, [supabaseClient])

  const signInWithGoogle = useCallback(
    async ({ redirectToPath }: { redirectToPath?: string }) => {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToPath,
        },
      })
      if (error) throw error
    },
    [supabaseClient]
  )

  // Derive user and isAuthenticated from session (single source of truth)
  const user = session?.user ?? null
  const isAuthenticated = !!session?.user

  return {
    user,
    session,
    isAuthenticated,
    isLoading,
    supabase: supabaseClient,
    logout,
    signInWithGoogle,
    getUser,
    userId: user?.id,
  }
}
