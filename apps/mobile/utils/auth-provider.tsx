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
import { API_BASE_URL, E2E_TESTING } from './constants'
import { authStateMachine, initialAuthState, type AuthState } from './auth/types'
import { extractSessionAccessToken, mapAuthStatus, resolveIsLoadingAuth, type AuthStatusCompat } from './auth/provider-utils'

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'
const OTP_REQUEST_TIMEOUT_MS = 12000
const AUTH_BOOT_TIMEOUT_MS = 8000

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
  resetAuthForE2E: () => Promise<void>
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

  useEffect(() => {
    if (!isSessionPending || state.status !== 'booting') {
      return
    }

    const timeout = setTimeout(() => {
      dispatch({ type: 'SESSION_EXPIRED' })
    }, AUTH_BOOT_TIMEOUT_MS)

    return () => {
      clearTimeout(timeout)
    }
  }, [isSessionPending, state.status])

  const requestEmailOtp = useCallback(async (email: string) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, OTP_REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(new URL('/api/auth/email-otp/send', API_BASE_URL).toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: 'sign-in',
        }),
        signal: controller.signal,
      })
    } catch (error) {
      const resolvedError =
        error instanceof Error && error.name === 'AbortError'
          ? new Error('Request timed out. Please try again.')
          : error instanceof Error
            ? error
            : new Error('Unable to send verification code.')
      dispatch({ type: 'OTP_REQUEST_FAILED', error: resolvedError })
      throw resolvedError
    } finally {
      clearTimeout(timeoutId)
    }

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
      const resolvedError = new Error(message)
      dispatch({ type: 'OTP_REQUEST_FAILED', error: resolvedError })
      throw resolvedError
    }

    dispatch({ type: 'OTP_REQUESTED' })
  }, [])

  const verifyEmailOtp = useCallback(async (input: { email: string; otp: string; name?: string }) => {
    dispatch({ type: 'OTP_VERIFICATION_STARTED' })
    
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
        type: 'OTP_VERIFICATION_FAILED', 
        error: error instanceof Error ? error : new Error('Sign in failed')
      })
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    dispatch({ type: 'SIGN_OUT_REQUESTED' })

    await authClient.signOut().catch(() => undefined)
    await LocalStore.clearAllData().catch(() => undefined)
    dispatch({ type: 'SIGN_OUT_SUCCESS' })
  }, [])

  const resetAuthForE2E = useCallback(async () => {
    if (!E2E_TESTING) {
      throw new Error('E2E reset is not available outside E2E runtime')
    }

    await authClient.signOut().catch(() => undefined)
    await LocalStore.clearAllData().catch(() => undefined)
    dispatch({ type: 'RESET_TO_SIGNED_OUT' })
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

    return extractSessionAccessToken(session)
  }, [session])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const authStatus = useMemo((): AuthStatusCompat => mapAuthStatus(state.status), [state.status])

  const isLoadingAuth = resolveIsLoadingAuth(state)
  const isSignedIn = state.status === 'signed_in' || state.status === 'signing_out'

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
      resetAuthForE2E,
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
      resetAuthForE2E,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
