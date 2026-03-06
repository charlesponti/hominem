import { useCallback, useReducer, useRef, useEffect } from 'react'
import type { AuthState, AuthEvent, UserProfile } from './types'
import { authStateMachine, initialAuthState } from './types'

interface UseAuthStateMachineOptions {
  onSessionLoad?: (abortSignal: AbortSignal) => Promise<UserProfile | null>
  onSignIn?: (abortSignal: AbortSignal) => Promise<UserProfile>
  onSignOut?: (abortSignal: AbortSignal) => Promise<void>
}

export function useAuthStateMachine(options: UseAuthStateMachineOptions = {}) {
  const [state, dispatch] = useReducer(authStateMachine, initialAuthState)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const getAbortSignal = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    return abortControllerRef.current.signal
  }, [])

  const loadSession = useCallback(async () => {
    if (!options.onSessionLoad) return

    const signal = getAbortSignal()
    
    try {
      const user = await options.onSessionLoad(signal)
      
      if (signal.aborted) return
      
      if (user) {
        dispatch({ type: 'SESSION_LOADED', user })
      } else {
        dispatch({ type: 'SESSION_EXPIRED' })
      }
    } catch (error) {
      if (signal.aborted) return
      dispatch({ 
        type: 'SYNC_FAILED', 
        error: error instanceof Error ? error : new Error('Session load failed') 
      })
    }
  }, [options.onSessionLoad, getAbortSignal])

  const signIn = useCallback(async () => {
    if (!options.onSignIn) return

    dispatch({ type: 'SIGN_IN_REQUESTED' })
    const signal = getAbortSignal()
    
    try {
      const user = await options.onSignIn(signal)
      
      if (signal.aborted) return
      
      dispatch({ type: 'SIGN_IN_SUCCESS', user })
    } catch (error) {
      if (signal.aborted) return
      dispatch({ 
        type: 'SIGN_IN_FAILURE', 
        error: error instanceof Error ? error : new Error('Sign in failed') 
      })
    }
  }, [options.onSignIn, getAbortSignal])

  const signOut = useCallback(async () => {
    if (!options.onSignOut) return

    dispatch({ type: 'SIGN_OUT_REQUESTED' })
    const signal = getAbortSignal()
    
    try {
      await options.onSignOut(signal)
      
      if (signal.aborted) return
      
      dispatch({ type: 'SIGN_OUT_SUCCESS' })
    } catch (error) {
      if (signal.aborted) return
      dispatch({ 
        type: 'SIGN_OUT_FAILURE', 
        error: error instanceof Error ? error : new Error('Sign out failed') 
      })
    }
  }, [options.onSignOut, getAbortSignal])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  return {
    state,
    dispatch,
    loadSession,
    signIn,
    signOut,
    clearError,
  }
}
