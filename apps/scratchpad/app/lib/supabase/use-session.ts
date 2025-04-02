import type { Session } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { useAuthStore } from './auth-store'

export function useSession() {
  const store = useAuthStore()

  const persistSession = useCallback(
    async (session: Session | null) => {
      try {
        if (session) {
          localStorage.setItem('auth_session', JSON.stringify(session))
        } else {
          localStorage.removeItem('auth_session')
        }
        store.setSession(session)
      } catch (err) {
        console.error('Failed to persist session:', err)
        store.setError(err as Error)
      }
    },
    [store]
  )

  const restoreSession = useCallback(async () => {
    try {
      const savedSession = localStorage.getItem('auth_session')
      if (savedSession) {
        const session = JSON.parse(savedSession) as Session
        store.setSession(session)
        return session
      }
    } catch (err) {
      console.error('Failed to restore session:', err)
      store.setError(err as Error)
    }
    return null
  }, [store])

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem('auth_session')
      store.reset()
    } catch (err) {
      console.error('Failed to clear session:', err)
      store.setError(err as Error)
    }
  }, [store])

  return {
    persistSession,
    restoreSession,
    clearSession,
    session: store.session,
    user: store.user,
    error: store.error,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated,
  }
}
