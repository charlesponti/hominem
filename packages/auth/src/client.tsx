import { createBrowserClient } from '@supabase/ssr'
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js'
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react'

// Registry to ensure only one Supabase instance exists per unique config
const clientRegistry = new Map<string, SupabaseClient>()

export function getSupabase(config: { url: string; anonKey: string }) {
  const key = `${config.url}:${config.anonKey}`
  const existing = clientRegistry.get(key)
  if (existing) return existing

  const client = createBrowserClient(config.url, config.anonKey)
  clientRegistry.set(key, client)
  return client
}

function useSupabaseAuth(
  initialSession: Session | null,
  config: { url: string; anonKey: string },
  onAuthEvent?: (event: AuthChangeEvent, session: Session | null) => void
) {
  const [supabaseClient] = useState(() => getSupabase(config))
  const [session, setSession] = useState<Session | null>(initialSession)
  const [isLoading, setIsLoading] = useState(!initialSession)
  // Explicitly maintain a verified user state fetched from Supabase Auth server
  const [authUser, setAuthUser] = useState<Awaited<ReturnType<typeof supabaseClient.auth.getUser>>['data']['user'] | null>(null)

  useEffect(() => {
    // If we have an initial session, we're not loading
    if (initialSession && isLoading) {
      setIsLoading(false)
    }

    // Get current verified user
    const init = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabaseClient.auth.getUser()
        setAuthUser(currentUser ?? null)
      } catch {
        setAuthUser(null)
      }
    }

    init()

    // Listen for auth changes - Supabase manages session state internally
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
      onAuthEvent?.(event, newSession)

      // Re-verify user when auth state changes
      ;(async () => {
        try {
          const {
            data: { user: currentUser },
          } = await supabaseClient.auth.getUser()
          setAuthUser(currentUser ?? null)
        } catch {
          setAuthUser(null)
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [supabaseClient, initialSession, isLoading, onAuthEvent])

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

  // Derive user and isAuthenticated from verified authUser
  const user = authUser ?? null
  const isAuthenticated = !!authUser

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
  onAuthEvent?: (event: AuthChangeEvent, session: Session | null) => void
}

export function SupabaseAuthProvider({
  children,
  initialSession = null,
  config,
  onAuthEvent,
}: SupabaseAuthProviderProps) {
  const auth = useSupabaseAuth(initialSession, config, onAuthEvent)

  return <SupabaseAuthContext.Provider value={auth}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider')
  }
  return context
}
