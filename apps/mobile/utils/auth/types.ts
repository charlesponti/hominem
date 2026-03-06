export type AuthStatus =
  | 'booting'
  | 'signed_out'
  | 'otp_requested'
  | 'verifying_otp'
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
  | { type: 'OTP_REQUESTED' }
  | { type: 'OTP_REQUEST_FAILED'; error: Error }
  | { type: 'OTP_VERIFICATION_STARTED' }
  | { type: 'OTP_VERIFICATION_FAILED'; error: Error }
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
