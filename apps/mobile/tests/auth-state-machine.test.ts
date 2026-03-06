import { authStateMachine, initialAuthState } from '../utils/auth/types'

describe('authStateMachine', () => {
  it('should return initial state for unknown actions', () => {
    const state = authStateMachine(initialAuthState, { type: 'UNKNOWN_ACTION' } as { type: 'UNKNOWN_ACTION' })
    expect(state).toEqual(initialAuthState)
  })

  describe('SESSION_LOADED', () => {
    it('should transition from booting to authenticated', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const state = authStateMachine(initialAuthState, {
        type: 'SESSION_LOADED',
        user,
      })

      expect(state.status).toBe('authenticated')
      expect(state.user).toEqual(user)
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('should clear any existing error', () => {
      const errorState = {
        ...initialAuthState,
        status: 'error' as const,
        error: new Error('Previous error'),
      }

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const state = authStateMachine(errorState, {
        type: 'SESSION_LOADED',
        user,
      })

      expect(state.status).toBe('authenticated')
      expect(state.error).toBeNull()
    })
  })

  describe('SESSION_EXPIRED', () => {
    it('should transition to unauthenticated', () => {
      const authenticatedState = {
        ...initialAuthState,
        status: 'authenticated' as const,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const state = authStateMachine(authenticatedState, {
        type: 'SESSION_EXPIRED',
      })

      expect(state.status).toBe('unauthenticated')
      expect(state.user).toBeNull()
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('SIGN_IN_REQUESTED', () => {
    it('should set loading state', () => {
      const state = authStateMachine(initialAuthState, {
        type: 'SIGN_IN_REQUESTED',
      })

      expect(state.status).toBe('booting')
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })
  })

  describe('SIGN_IN_SUCCESS', () => {
    it('should set authenticated user', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const state = authStateMachine(initialAuthState, {
        type: 'SIGN_IN_SUCCESS',
        user,
      })

      expect(state.status).toBe('authenticated')
      expect(state.user).toEqual(user)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('SIGN_IN_FAILURE', () => {
    it('should set error state', () => {
      const error = new Error('Sign in failed')

      const state = authStateMachine(initialAuthState, {
        type: 'SIGN_IN_FAILURE',
        error,
      })

      expect(state.status).toBe('error')
      expect(state.error).toBe(error)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('SIGN_OUT_REQUESTED', () => {
    it('should set loading state', () => {
      const authenticatedState = {
        ...initialAuthState,
        status: 'authenticated' as const,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const state = authStateMachine(authenticatedState, {
        type: 'SIGN_OUT_REQUESTED',
      })

      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })
  })

  describe('SIGN_OUT_SUCCESS', () => {
    it('should clear user and set unauthenticated', () => {
      const authenticatedState = {
        ...initialAuthState,
        status: 'authenticated' as const,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const state = authStateMachine(authenticatedState, {
        type: 'SIGN_OUT_SUCCESS',
      })

      expect(state.status).toBe('unauthenticated')
      expect(state.user).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('SIGN_OUT_FAILURE', () => {
    it('should set error state', () => {
      const authenticatedState = {
        ...initialAuthState,
        status: 'authenticated' as const,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      const error = new Error('Sign out failed')

      const state = authStateMachine(authenticatedState, {
        type: 'SIGN_OUT_FAILURE',
        error,
      })

      expect(state.status).toBe('error')
      expect(state.error).toBe(error)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('SYNC_STARTED', () => {
    it('should set loading state', () => {
      const state = authStateMachine(initialAuthState, {
        type: 'SYNC_STARTED',
      })

      expect(state.isLoading).toBe(true)
    })
  })

  describe('SYNC_COMPLETED', () => {
    it('should clear loading and error', () => {
      const syncingState = {
        ...initialAuthState,
        isLoading: true,
        error: new Error('Previous error'),
      }

      const state = authStateMachine(syncingState, {
        type: 'SYNC_COMPLETED',
      })

      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('SYNC_FAILED', () => {
    it('should set error state', () => {
      const syncingState = {
        ...initialAuthState,
        isLoading: true,
      }

      const error = new Error('Sync failed')

      const state = authStateMachine(syncingState, {
        type: 'SYNC_FAILED',
        error,
      })

      expect(state.status).toBe('error')
      expect(state.error).toBe(error)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('CLEAR_ERROR', () => {
    it('should clear error and keep status', () => {
      const errorState = {
        ...initialAuthState,
        status: 'error' as const,
        error: new Error('Some error'),
      }

      const state = authStateMachine(errorState, {
        type: 'CLEAR_ERROR',
      })

      expect(state.error).toBeNull()
      expect(state.status).toBe('unauthenticated')
    })

    it('should not change authenticated status', () => {
      const authenticatedErrorState = {
        ...initialAuthState,
        status: 'authenticated' as const,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        error: new Error('Some error'),
      }

      const state = authStateMachine(authenticatedErrorState, {
        type: 'CLEAR_ERROR',
      })

      expect(state.error).toBeNull()
      expect(state.status).toBe('authenticated')
      expect(state.user).toEqual(authenticatedErrorState.user)
    })
  })
})
