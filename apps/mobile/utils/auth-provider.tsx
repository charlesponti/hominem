import * as SecureStore from 'expo-secure-store'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type PropsWithChildren,
} from 'react'

import { authClient } from '../lib/auth-client'
import { LocalStore } from './local-store'
import type { UserProfile as LocalUserProfile } from './local-store/types'
import { API_BASE_URL } from './constants'
import { authStateMachine, initialAuthState, type AuthState } from './auth/types'

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'

// Map local store type to auth state machine type
function toAuthUserProfile(localProfile: LocalUserProfile | null): AuthState['user'] {
  if (!localProfile) return null
  return {
    id: localProfile.id,
    email: localProfile.email,
    name: localProfile.name,
    createdAt: localProfile.createdAt,
    updatedAt: localProfile.updatedAt,
  }
}

function fromBetterAuthUser(user: {
  id: string
  email?: string | null
  name?: string | null
  createdAt?: Date | string | undefined
  updatedAt?: Date | string | undefined
}): NonNullable<AuthState['user']> {
  const toIso = (date: unknown): string => {
    if (!date) return new Date().toISOString()
    if (typeof date === 'string') return date
    if (date instanceof Date) return date.toISOString()
    return new Date().toISOString()
  }

  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
  }
}

async function clearLegacyLocalDataOnce() {
  const migrationFlag = await SecureStore.getItemAsync(LOCAL_MIGRATION_KEY)
  if (migrationFlag === '1') {
    return
  }

  await LocalStore.clearAllData()
  await SecureStore.setItemAsync(LOCAL_MIGRATION_KEY, '1')
}

type AuthStatusCompat = 'booting' | 'authenticated' | 'unauthenticated' | 'error' | 'signed_out' | 'signed_in'

type AuthContextType = {
  authStatus: AuthStatusCompat
  isLoadingAuth: boolean
  isSignedIn: boolean
  currentUser: LocalUserProfile | null
  requestEmailOtp: (email: string) => Promise<void>
  verifyEmailOtp: (input: { email: string; otp: string; name?: string }) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateProfile: (updates: Partial<LocalUserProfile>) => Promise<LocalUserProfile>
  getAccessToken: () => Promise<string | null>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(authStateMachine, initialAuthState)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const sessionUser = session?.user ?? null

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Session sync effect - replaces the complex useEffect with timeout
  useEffect(() => {
    // Create new abort controller for this effect run
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const syncSession = async () => {
      if (isSessionPending) {
        // Still loading - remain in booting state
        return
      }

      if (!sessionUser) {
        // No session - user is signed out
        dispatch({ type: 'SESSION_EXPIRED' })
        return
      }

      // We have a session user - sync to local store
      dispatch({ type: 'SYNC_STARTED' })

      try {
        if (signal.aborted) return

        await clearLegacyLocalDataOnce()
        
        if (signal.aborted) return

        const local = await LocalStore.getUserProfile()
        
        if (signal.aborted) return

        const authUser = fromBetterAuthUser(sessionUser)
        const merged: LocalUserProfile = {
          id: authUser.id,
          email: authUser.email ?? local?.email ?? null,
          name: authUser.name ?? local?.name ?? null,
          createdAt: authUser.createdAt,
          updatedAt: new Date().toISOString(),
        }

        const saved = await LocalStore.upsertUserProfile(merged)
        
        if (!signal.aborted && saved) {
          dispatch({ 
            type: 'SESSION_LOADED', 
            user: toAuthUserProfile(saved)!
          })
        }
      } catch (error) {
        console.error('[mobile-auth] session sync failed', error)
        if (!signal.aborted) {
          dispatch({ 
            type: 'SYNC_FAILED', 
            error: error instanceof Error ? error : new Error('Session sync failed')
          })
        }
      }
    }

    void syncSession()

    return () => {
      // Abort any in-flight operations
      abortControllerRef.current?.abort()
    }
  }, [isSessionPending, sessionUser?.id, sessionUser?.email, sessionUser?.name])

  const requestEmailOtp = useCallback(async (email: string) => {
    const response = await fetch(new URL('/api/auth/email-otp/send', API_BASE_URL).toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email,
        type: 'sign-in',
      }),
    })

    if (!response.ok) {
      let message = 'Unable to send verification code.'
      try {
        const payload = (await response.json()) as { message?: string; error?: string }
        if (payload.message) {
          message = payload.message
        } else if (payload.error) {
          message = payload.error
        }
      } catch {}
      throw new Error(message)
    }
  }, [])

  const verifyEmailOtp = useCallback(async (input: { email: string; otp: string; name?: string }) => {
    dispatch({ type: 'SIGN_IN_REQUESTED' })
    
    try {
      const result = await authClient.signIn.emailOtp({
        email: input.email,
        otp: input.otp,
        ...(input.name ? { name: input.name } : {}),
      })

      if (result.error) {
        const message =
          typeof result.error.message === 'string'
            ? result.error.message
            : 'Unable to verify code.'
        throw new Error(message)
      }

      // Session will update via useSession hook, which triggers the sync effect
    } catch (error) {
      dispatch({ 
        type: 'SIGN_IN_FAILURE', 
        error: error instanceof Error ? error : new Error('Sign in failed')
      })
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    dispatch({ type: 'SIGN_OUT_REQUESTED' })
    
    try {
      await authClient.signOut()
      await LocalStore.clearAllData()
      dispatch({ type: 'SIGN_OUT_SUCCESS' })
    } catch (error) {
      dispatch({ 
        type: 'SIGN_OUT_FAILURE', 
        error: error instanceof Error ? error : new Error('Sign out failed')
      })
      throw error
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    throw new Error('Account deletion is not available yet.')
  }, [])

  const updateProfile = useCallback(
    async (updates: Partial<LocalUserProfile>) => {
      if (!state.user) {
        throw new Error('No user profile found')
      }
      
      const merged: LocalUserProfile = {
        id: state.user.id,
        email: state.user.email ?? null,
        name: state.user.name ?? null,
        createdAt: state.user.createdAt,
        updatedAt: new Date().toISOString(),
        ...updates,
      }
      
      const saved = await LocalStore.upsertUserProfile(merged)
      if (saved) {
        dispatch({ type: 'SESSION_LOADED', user: toAuthUserProfile(saved)! })
      }
      return saved
    },
    [state.user]
  )

  const getAccessToken = useCallback(async () => {
    if (!session?.user) {
      return null
    }
    const maybeSession = session as { session?: { accessToken?: string; token?: string } } | null
    const accessToken = maybeSession?.session?.accessToken
    if (typeof accessToken === 'string' && accessToken.length > 0) {
      return accessToken
    }
    const token = maybeSession?.session?.token
    if (typeof token === 'string' && token.length > 0) {
      return token
    }
    return null
  }, [session])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  // Map state machine status to backward-compatible status
  const authStatus = useMemo((): AuthStatusCompat => {
    switch (state.status) {
      case 'authenticated':
        return 'signed_in'
      case 'unauthenticated':
        return 'signed_out'
      default:
        return state.status
    }
  }, [state.status])

  const isLoadingAuth = state.isLoading || state.status === 'booting'
  const isSignedIn = state.status === 'authenticated'
  
  // Convert auth user to local user profile for backward compatibility
  const currentUser = useMemo((): LocalUserProfile | null => {
    if (!state.user) return null
    return {
      id: state.user.id,
      email: state.user.email,
      name: state.user.name,
      createdAt: state.user.createdAt,
      updatedAt: state.user.updatedAt,
    }
  }, [state.user])

  const value = useMemo(
    () => ({
      authStatus,
      isLoadingAuth,
      isSignedIn,
      currentUser,
      requestEmailOtp,
      verifyEmailOtp,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
      clearError,
    }),
    [
      authStatus,
      isLoadingAuth,
      isSignedIn,
      currentUser,
      requestEmailOtp,
      verifyEmailOtp,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
      clearError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
