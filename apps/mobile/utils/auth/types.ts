export type AuthStatus =
  | 'booting'
  | 'signed_out'
  | 'requesting_otp'
  | 'otp_requested'
  | 'verifying_otp'
  | 'minting_api_token'
  | 'syncing_profile'
  | 'authenticating_passkey'
  | 'refreshing_session'
  | 'signed_in'
  | 'signing_out'
  | 'degraded'
  | 'terminal_error'

export interface UserProfile {
  id: string
  email: string | null | undefined
  name: string | null | undefined
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  status: AuthStatus
  user: UserProfile | null
  error: Error | null
  isLoading: boolean
}

export type AuthEvent =
  | { type: 'SESSION_LOADED'; user: UserProfile }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'OTP_REQUEST_STARTED' }
  | { type: 'OTP_REQUESTED' }
  | { type: 'OTP_REQUEST_FAILED'; error: Error }
  | { type: 'OTP_VERIFICATION_STARTED' }
  | { type: 'OTP_VERIFICATION_FAILED'; error: Error }
  | { type: 'API_TOKEN_MINT_STARTED' }
  | { type: 'API_TOKEN_MINT_FAILED'; error: Error }
  | { type: 'PROFILE_SYNC_STARTED' }
  | { type: 'PASSKEY_AUTH_STARTED' }
  | { type: 'PASSKEY_AUTH_FAILED'; error: Error }
  | { type: 'REFRESH_STARTED' }
  | { type: 'REFRESH_FAILED'; error: Error }
  | { type: 'SIGN_OUT_REQUESTED' }
  | { type: 'SIGN_OUT_SUCCESS' }
  | { type: 'SYNC_STARTED' }
  | { type: 'SYNC_COMPLETED' }
  | { type: 'SYNC_FAILED'; error: Error }
  | { type: 'RESET_TO_SIGNED_OUT' }
  | { type: 'FATAL_ERROR'; error: Error }
  | { type: 'CLEAR_ERROR' }

export interface AuthContext {
  state: AuthState
  dispatch: (event: AuthEvent) => void
}

// Initial state
export const initialAuthState: AuthState = {
  status: 'booting',
  user: null,
  error: null,
  isLoading: false,
}

export function authStateMachine(state: AuthState, event: AuthEvent): AuthState {
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

    case 'API_TOKEN_MINT_STARTED':
      return {
        ...state,
        status: 'minting_api_token',
        error: null,
        isLoading: true,
      }

    case 'API_TOKEN_MINT_FAILED':
      return {
        ...state,
        status: 'degraded',
        error: event.error,
        isLoading: false,
      }

    case 'PROFILE_SYNC_STARTED':
      return {
        ...state,
        status: 'syncing_profile',
        error: null,
        isLoading: true,
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

    case 'OTP_VERIFICATION_FAILED':
      return {
        ...state,
        status: 'otp_requested',
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

    case 'SYNC_STARTED':
      return {
        ...state,
        isLoading: true,
      }

    case 'SYNC_COMPLETED':
      return {
        ...state,
        isLoading: false,
        error: null,
      }

    case 'SYNC_FAILED':
      return {
        ...state,
        status: 'degraded',
        error: event.error,
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
        status: 'terminal_error',
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
