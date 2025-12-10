import { useCallback, useEffect, useMemo, useState } from 'react'
import { createSupabaseClient, getAuthConfig } from '../client'
import type { AuthContextType, HominemUser, SupabaseAuthSession, SupabaseAuthUser } from '../types'
import { createHominemUserFromSupabase } from '../user'

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<HominemUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null)
  const [session, setSession] = useState<SupabaseAuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const config = useMemo(() => getAuthConfig(), [])
  const supabase = useMemo(() => createSupabaseClient(config), [config])

  const refreshUser = useCallback(async () => {
    if (!supabaseUser) return
    setUser(createHominemUserFromSupabase(supabaseUser))
  }, [supabaseUser])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('Error getting initial session:', error)
          setIsLoading(false)
          return
        }

        const typedSession = initialSession as SupabaseAuthSession | null
        const typedUser = (typedSession?.user as SupabaseAuthUser | null) ?? null

        setSession(typedSession)
        setSupabaseUser(typedUser)
        setUser(typedUser ? createHominemUserFromSupabase(typedUser) : null)
        setIsLoading(false)
      } catch (error) {
        if (!mounted) return
        console.error('Error initializing auth:', error)
        setIsLoading(false)
      }
    }

    initializeAuth()

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return

      const typedSession = newSession as SupabaseAuthSession | null
      const typedUser = (typedSession?.user as SupabaseAuthUser | null) ?? null

      setSession(typedSession)
      setSupabaseUser(typedUser)
      setUser(typedUser ? createHominemUserFromSupabase(typedUser) : null)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      data?.subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error || undefined }
      } catch (error) {
        return { error: error as Error }
      }
    },
    [supabase.auth]
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signUp({ email, password })
        return { error: error || undefined }
      } catch (error) {
        return { error: error as Error }
      }
    },
    [supabase.auth]
  )

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github' | 'discord') => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: config.redirectTo,
          },
        })
        return { error: error || undefined }
      } catch (error) {
        return { error: error as Error }
      }
    },
    [supabase.auth, config]
  )

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error: error || undefined }
    } catch (error) {
      return { error: error as Error }
    }
  }, [supabase.auth])

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: config.redirectTo,
        })
        return { error: error || undefined }
      } catch (error) {
        return { error: error as Error }
      }
    },
    [supabase.auth, config.redirectTo]
  )

  return {
    user,
    supabaseUser,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    refreshUser,
  }
}
