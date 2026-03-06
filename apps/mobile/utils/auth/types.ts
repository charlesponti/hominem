// Auth State Machine Types

export type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated' | 'error'

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
  | { type: 'SIGN_IN_REQUESTED' }
  | { type: 'SIGN_IN_SUCCESS'; user: UserProfile }
  | { type: 'SIGN_IN_FAILURE'; error: Error }
  | { type: 'SIGN_OUT_REQUESTED' }
  | { type: 'SIGN_OUT_SUCCESS' }
  | { type: 'SIGN_OUT_FAILURE'; error: Error }
  | { type: 'SYNC_STARTED' }
  | { type: 'SYNC_COMPLETED' }
  | { type: 'SYNC_FAILED'; error: Error }
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

// State machine reducer
export function authStateMachine(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'SESSION_LOADED':
      return {
        ...state,
        status: 'authenticated',
        user: event.user,
        error: null,
        isLoading: false,
      }

    case 'SESSION_EXPIRED':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        error: null,
        isLoading: false,
      }

    case 'SIGN_IN_REQUESTED':
      return {
        ...state,
        status: 'booting',
        isLoading: true,
        error: null,
      }

    case 'SIGN_IN_SUCCESS':
      return {
        ...state,
        status: 'authenticated',
        user: event.user,
        error: null,
        isLoading: false,
      }

    case 'SIGN_IN_FAILURE':
      return {
        ...state,
        status: 'error',
        error: event.error,
        isLoading: false,
      }

    case 'SIGN_OUT_REQUESTED':
      return {
        ...state,
        isLoading: true,
        error: null,
      }

    case 'SIGN_OUT_SUCCESS':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        error: null,
        isLoading: false,
      }

    case 'SIGN_OUT_FAILURE':
      return {
        ...state,
        status: 'error',
        error: event.error,
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
        status: 'error',
        error: event.error,
        isLoading: false,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        status: state.status === 'error' ? 'unauthenticated' : state.status,
      }

    default:
      return state
  }
}
