import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { createHominemUserFromSupabase, createSupabaseClient, getAuthConfig } from '../client'
import type { AuthContextType, HominemUser } from '../types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<HominemUser | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const config = getAuthConfig()
  const supabase = createSupabaseClient(config)

  const refreshUser = useCallback(async () => {
    if (!supabaseUser) return

    try {
      const hominemUser = createHominemUserFromSupabase(supabaseUser)
      setUser(hominemUser)
    } catch (error) {
      console.error('Error refreshing user:', error)
    }
  }, [supabaseUser])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting initial session:', error)
          return
        }

        if (initialSession?.user) {
          const hominemUser = createHominemUserFromSupabase(initialSession.user)
          if (mounted) {
            setSupabaseUser(initialSession.user)
            setSession(initialSession)
            setUser(hominemUser)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      if (newSession?.user) {
        const hominemUser = createHominemUserFromSupabase(newSession.user)
        setSupabaseUser(newSession.user)
        setSession(newSession)
        setUser(hominemUser)
      } else {
        setSupabaseUser(null)
        setSession(null)
        setUser(null)
      }

      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth])

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
    [supabase.auth, config.redirectTo]
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

  const value: AuthContextType = {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
