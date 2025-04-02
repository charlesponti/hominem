import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import type { AuthError, AuthState } from './types'

interface AuthStore extends AuthState {
  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setError: (error: AuthError | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

const initialState: AuthState = {
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setSession: (session: Session | null) =>
    set((state: AuthStore) => ({
      ...state,
      session,
      isAuthenticated: !!session && !!state.user,
    })),
  setUser: (user: User | null) =>
    set((state: AuthStore) => ({
      ...state,
      user,
      isAuthenticated: !!user && !!state.session,
    })),
  setError: (error: AuthError | null) => set((state: AuthStore) => ({ ...state, error })),
  setLoading: (isLoading: boolean) => set((state: AuthStore) => ({ ...state, isLoading })),
  reset: () => set(initialState),
}))
