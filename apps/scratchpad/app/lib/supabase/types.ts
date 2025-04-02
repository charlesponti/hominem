import type { Session, User } from '@supabase/supabase-js'

export interface AuthSession {
  session: Session | null
  user: User | null
}

export interface AuthError {
  message: string
  status?: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials extends LoginCredentials {
  passwordConfirmation?: string
}

export interface ResetPasswordCredentials {
  email: string
}

export interface UpdatePasswordCredentials {
  password: string
}

export interface AuthState {
  session: Session | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: AuthError | null
}
