import { createBrowserClient } from '@supabase/ssr'
import type { Session } from '@supabase/supabase-js'
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

export function getSupabase(config: { url: string; anonKey: string }) {
  return createBrowserClient(config.url, config.anonKey)
}

function useSupabaseAuth(initialSession: Session | null, config: { url: string; anonKey: string }) {
  const [supabaseClient] = useState(() => getSupabase(config))
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialSession)

  useEffect(() => {
    // If we have an initial session, we're not loading
    if (initialSession && isLoading) {
      setIsLoading(false)
    }

    // Listen for auth changes - Supabase manages session state internally
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient, initialSession, isLoading])

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
    getUser,
    userId: user?.id,
  }
}

type SupabaseAuthContextType = ReturnType<typeof useSupabaseAuth>

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

interface SupabaseAuthProviderProps {
  children: ReactNode
  initialSession?: Session | null
  config: { url: string; anonKey: string }
}

export function SupabaseAuthProvider({
  children,
  initialSession = null,
  config,
}: SupabaseAuthProviderProps) {
  const auth = useSupabaseAuth(initialSession, config)

  return <SupabaseAuthContext.Provider value={auth}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider')
  }
  return context
}
