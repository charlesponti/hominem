/**
 * Authentication Context for React applications
 * Provides auth state and functions to consuming components via useAuth hook
 */

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { isMockAuthEnabled } from './config'
import { DEFAULT_MOCK_USER, type User } from './mock-users'
import { MockAuthProvider } from './providers/mock'
import type { Session } from './auth.types'

/**
 * Authentication state provided by the context
 */
export interface AuthContextState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Create the authentication context
 */
const AuthContext = createContext<AuthContextState | undefined>(undefined)

/**
 * Authentication Provider component
 * Wrap your app root with this component to enable authentication
 */
export interface AuthProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'hominem_auth_session'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY)
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as { user: User; session: Session }
        setUser(parsed.user)
        setSession(parsed.session)
        setIsAuthenticated(true)
      } catch (err) {
        // Invalid JSON in localStorage, clear it
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const signIn = useCallback(async () => {
    if (!isMockAuthEnabled()) {
      throw new Error('Real Apple Auth not yet implemented')
    }

    setIsLoading(true)
    try {
      const provider = new MockAuthProvider()
      const response = await provider.signIn()

      setUser(response.user)
      setSession(response.session)
      setIsAuthenticated(true)

      // Persist to localStorage
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: response.user,
          session: response.session,
        }),
      )
    } catch (err) {
      console.error('Sign-in error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isMockAuthEnabled()) {
      throw new Error('Real Apple Auth not yet implemented')
    }

    setIsLoading(true)
    try {
      const provider = new MockAuthProvider()
      await provider.signOut()

      setUser(null)
      setSession(null)
      setIsAuthenticated(false)

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Sign-out error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value: AuthContextState = {
    user,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access authentication state and functions
 */
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Hook to check if user is authenticated and redirect if not
 * Useful for protecting routes or components
 */
export function useProtectedRoute(): { isAuthenticated: boolean; isLoading: boolean } {
  const { isAuthenticated, isLoading } = useAuth()

  // In a real implementation, this could redirect to sign-in page
  // For now, just return the state so components can handle it
  return { isAuthenticated, isLoading }
}
