import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useSupabaseAuth } from './auth-hooks'
import { useAuthStore } from './auth-store'
import { supabase } from './client'
import type { AuthError, AuthState } from './types'
import { useSession } from './use-session'

interface AuthContextType extends AuthState {
  loginWithGoogle: () => Promise<unknown>
  logout: () => Promise<{ error: AuthError | null }>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSupabaseAuth()
  const store = useAuthStore()
  const { persistSession, restoreSession, clearSession } = useSession()
  const initialLoadRef = useRef(false)

  const sessionManager = useMemo(
    () => ({
      setLoading: store.setLoading,
      setError: store.setError,
      setUser: store.setUser,
      persist: persistSession,
      restore: restoreSession,
      getSession: auth.getSession,
    }),
    [
      auth.getSession,
      persistSession,
      restoreSession,
      store.setLoading,
      store.setError,
      store.setUser,
    ]
  )

  const checkSession = useCallback(async () => {
    if (initialLoadRef.current) return
    initialLoadRef.current = true

    const { setLoading, setError, setUser, persist, restore, getSession } = sessionManager

    try {
      setLoading(true)
      // Try to restore session from storage first
      const savedSession = await restore()
      if (savedSession) {
        return
      }

      // If no saved session, check with Supabase
      const { session, user, error } = await getSession()

      if (error) throw error

      await persist(session)
      setUser(user)
    } catch (err) {
      setError(err as AuthError)
    } finally {
      setLoading(false)
    }
  }, [sessionManager])

  // Initial session check
  useEffect(() => {
    checkSession()
  }, [checkSession])

  // Auth state listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const user = session?.user ?? null
        await sessionManager.persist(session)
        sessionManager.setUser(user)
        sessionManager.setError(null)
      } catch (err) {
        sessionManager.setError(err as AuthError)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [sessionManager])

  const value = useMemo(
    () => ({
      ...store,
      loginWithGoogle: auth.loginWithGoogle,
      logout: async () => {
        try {
          const result = await auth.logout()
          if (result.error) throw result.error
          clearSession()
          return result
        } catch (err) {
          store.setError(err as AuthError)
          return { error: err as AuthError }
        }
      },
      clearError: () => store.setError(null),
    }),
    [auth, clearSession, store]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
