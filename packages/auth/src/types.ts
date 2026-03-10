export interface HominemUser {
  id: string
  email: string
  name?: string | undefined
  image?: string | undefined
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

// Canonical app auth state machine types
// Used by all first-party apps (mobile and web) for consistent auth behavior
export type AppAuthStatus =
  | 'booting'
  | 'signed_out'
  | 'requesting_otp'
  | 'otp_requested'
  | 'verifying_otp'
  | 'authenticating_passkey'
  | 'refreshing_session'
  | 'signed_in'
  | 'signing_out'
  | 'degraded'

export interface AppAuthState {
  status: AppAuthStatus
  user: HominemUser | null
  error: Error | null
  isLoading: boolean
}

export type AppAuthEvent =
  | { type: 'SESSION_LOADED'; user: HominemUser }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'OTP_REQUEST_STARTED' }
  | { type: 'OTP_REQUESTED' }
  | { type: 'OTP_REQUEST_FAILED'; error: Error }
  | { type: 'OTP_VERIFICATION_STARTED' }
  | { type: 'OTP_VERIFICATION_FAILED'; error: Error }
  | { type: 'PASSKEY_AUTH_STARTED' }
  | { type: 'PASSKEY_AUTH_FAILED'; error: Error }
  | { type: 'REFRESH_STARTED' }
  | { type: 'REFRESH_FAILED'; error: Error }
  | { type: 'SIGN_OUT_REQUESTED' }
  | { type: 'SIGN_OUT_SUCCESS' }
  | { type: 'RESET_TO_SIGNED_OUT' }
  | { type: 'FATAL_ERROR'; error: Error }
  | { type: 'CLEAR_ERROR' }

export function appAuthStateMachine(state: AppAuthState, event: AppAuthEvent): AppAuthState {
  switch (event.type) {
    case 'SESSION_LOADED':
      return {
        ...state,
        status: 'signed_in',
        user: event.user,
        error: null,
        isLoading: false,
      }

    case 'SESSION_EXPIRED':
      return {
        ...state,
        status: 'signed_out',
        user: null,
        error: null,
        isLoading: false,
      }

    case 'OTP_REQUEST_STARTED':
      return {
        ...state,
        status: 'requesting_otp',
        isLoading: true,
        error: null,
      }

    case 'OTP_REQUESTED':
      return {
        ...state,
        status: 'otp_requested',
        isLoading: false,
        error: null,
      }

    case 'OTP_REQUEST_FAILED':
      return {
        ...state,
        status: 'degraded',
        error: event.error,
        isLoading: false,
      }

    case 'OTP_VERIFICATION_STARTED':
      return {
        ...state,
        status: 'verifying_otp',
        error: null,
        isLoading: true,
      }

    case 'OTP_VERIFICATION_FAILED':
      return {
        ...state,
        status: 'otp_requested',
        error: event.error,
        isLoading: false,
      }

    case 'PASSKEY_AUTH_STARTED':
      return {
        ...state,
        status: 'authenticating_passkey',
        error: null,
        isLoading: true,
      }

    case 'PASSKEY_AUTH_FAILED':
      return {
        ...state,
        status: 'degraded',
        error: event.error,
        isLoading: false,
      }

    case 'REFRESH_STARTED':
      return {
        ...state,
        status: 'refreshing_session',
        error: null,
        isLoading: true,
      }

    case 'REFRESH_FAILED':
      return {
        ...state,
        status: 'signed_out',
        error: event.error,
        isLoading: false,
      }

    case 'SIGN_OUT_REQUESTED':
      return {
        ...state,
        status: 'signing_out',
        isLoading: true,
        error: null,
      }

    case 'SIGN_OUT_SUCCESS':
      return {
        ...state,
        status: 'signed_out',
        user: null,
        error: null,
        isLoading: false,
      }

    case 'RESET_TO_SIGNED_OUT':
      return {
        ...state,
        status: 'signed_out',
        user: null,
        error: null,
        isLoading: false,
      }

    case 'FATAL_ERROR':
      return {
        ...state,
        status: 'degraded',
        error: event.error,
        isLoading: false,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        status: state.status === 'degraded' ? 'signed_out' : state.status,
      }

    default:
      return state
  }
}

export const initialAppAuthState: AppAuthState = {
  status: 'booting',
  user: null,
  error: null,
  isLoading: false,
}

export interface AuthEnvelope {
  sub: string
  sid: string
  scope: string[]
  role: 'user' | 'admin'
  amr: string[]
  authTime: number
}

export interface HominemSession {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  expires_at: string
  refresh_token?: string | undefined
}

export interface AuthClient {
  auth: {
    signInWithOAuth: (input: {
      provider: 'google'
      options?: { redirectTo?: string | undefined } | undefined
    }) => Promise<{ error: Error | null }>
    signOut: () => Promise<{ error: Error | null }>
    getSession: () => Promise<{
      data: {
        session: HominemSession | null
      }
      error: Error | null
    }>
  }
}

export interface AuthContextType {
  user: HominemUser | null
  session: HominemSession | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: () => Promise<void>
  signInWithEmail: () => Promise<void>
  signInWithPasskey: () => Promise<void>
  addPasskey: (name?: string) => Promise<void>
  linkGoogle: () => Promise<void>
  unlinkGoogle: () => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<HominemSession | null>
  requireStepUp: (action: string) => Promise<void>
  logout: () => Promise<void>
  authClient: AuthClient
  userId?: string | undefined
}

export interface AuthConfig {
  apiBaseUrl: string
  redirectTo?: string
}

export interface ServerAuthResult {
  user: HominemUser | null
  session: HominemSession | null
  auth: AuthEnvelope | null
  isAuthenticated: boolean
}
