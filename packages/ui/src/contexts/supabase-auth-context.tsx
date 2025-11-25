import type { SupabaseClient } from '@supabase/supabase-js'
import { createContext, type ReactNode, useContext } from 'react'
import { useSupabaseAuth } from '../hooks/use-supabase-auth'

interface SupabaseAuthContextType {
  user: unknown
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  userId?: string
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

interface SupabaseAuthProviderProps {
  children: ReactNode
  client?: SupabaseClient
}

export function SupabaseAuthProvider({ children, client }: SupabaseAuthProviderProps) {
  const auth = useSupabaseAuth(client)

  return <SupabaseAuthContext.Provider value={auth}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuthContext() {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider')
  }
  return context
}

// Compatibility alias for existing code
export const useAuth = useSupabaseAuthContext
