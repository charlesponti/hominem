import type {
  AuthContextType,
  HominemUser,
  SupabaseAuthSession,
  SupabaseAuthUser,
} from '@hominem/auth'
import { createHominemUserFromSupabase } from '@hominem/auth'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null)
  const [hominemUser, setHominemUser] = useState<HominemUser | null>(null)
  const [session, setSession] = useState<SupabaseAuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const getUser = useCallback(async () => {
    const {
      data: { user: currentUser },
      error,
    } = await supabase.auth.getUser()
    return { user: currentUser as SupabaseAuthUser | null, error }
  }, [supabase.auth])

  useEffect(() => {
    setIsLoading(true)

    // Get initial authenticated user
    getUser().then(({ user: currentUser }) => {
      if (currentUser) {
        setSupabaseUser(currentUser)
        setHominemUser(createHominemUserFromSupabase(currentUser))
        // Get session for access token after user verification
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          setSession(currentSession as SupabaseAuthSession | null)
        })
      } else {
        setSupabaseUser(null)
        setHominemUser(null)
        setSession(null)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      // Verify the user data by calling getUser
      if (newSession?.user) {
        const {
          data: { user: verifiedUser },
        } = await supabase.auth.getUser()
        const typedUser = verifiedUser as SupabaseAuthUser | null
        setSupabaseUser(typedUser)
        setHominemUser(typedUser ? createHominemUserFromSupabase(typedUser) : null)
        setSession(newSession as SupabaseAuthSession | null)
      } else {
        setSupabaseUser(null)
        setHominemUser(null)
        setSession(null)
      }
      setIsLoading(false)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [getUser, supabase.auth])

  const refreshUser = useCallback(async () => {
    if (!supabaseUser) return
    setHominemUser(createHominemUserFromSupabase(supabaseUser))
  }, [supabaseUser])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error || undefined }
    },
    [supabase.auth]
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error || undefined }
    },
    [supabase.auth]
  )

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'github' | 'discord') => {
      const { error } = await supabase.auth.signInWithOAuth({ provider })
      return { error: error || undefined }
    },
    [supabase.auth]
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error || undefined }
  }, [supabase.auth])

  const resetPassword = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      return { error: error || undefined }
    },
    [supabase.auth]
  )

  const value: AuthContextType = {
    user: hominemUser,
    supabaseUser,
    session,
    isLoading,
    isAuthenticated: !!hominemUser,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Convenience hooks for compatibility with existing code
export const useUser = () => {
  const { supabaseUser, isLoading } = useAuth()
  return {
    user: supabaseUser
      ? {
          id: supabaseUser.id,
          email: supabaseUser.email,
          fullName: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
          firstName: supabaseUser.user_metadata?.first_name,
          lastName: supabaseUser.user_metadata?.last_name,
          primaryEmailAddress: { emailAddress: supabaseUser.email },
          imageUrl: supabaseUser.user_metadata?.avatar_url,
        }
      : null,
    isLoaded: !isLoading,
  }
}
