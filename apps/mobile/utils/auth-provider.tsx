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
const API_ACCESS_TOKEN_KEY = 'hominem_mobile_api_access_token_v1'
const API_REFRESH_TOKEN_KEY = 'hominem_mobile_api_refresh_token_v1'
const OTP_REQUEST_TIMEOUT_MS = 12000
const AUTH_BOOT_TIMEOUT_MS = 8000

// Single-path architecture: tokens are issued at sign-in time only
interface SignInResponse {
  user: {
    id: string
    email: string
    name?: string | null
  }
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

interface SessionResponse {
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    name?: string | null
  } | null
}

interface RefreshResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

// Map local store type to auth state machine type
function toAuthUserProfile(localProfile: LocalUserProfile | null): AuthState['user'] {
  if (!localProfile) return null
  return {
    id: localProfile.id,
    email: localProfile.email ?? null,
    name: localProfile.name ?? null,
    createdAt: localProfile.createdAt,
    updatedAt: localProfile.updatedAt,
  } as AuthState['user']
}

function fromSignInUser(user: {
  id: string
  email: string
  name?: string | null
}): LocalUserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  completePasskeySignIn: (input: SignInResponse) => Promise<void>
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
  const apiAccessTokenRef = useRef<string | null>(null)
  const apiRefreshTokenRef = useRef<string | null>(null)
  const hasBootstrappedRef = useRef(false)
  const syncGenerationRef = useRef(0)

  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const sessionUser = session?.user ?? null

  const setApiTokens = useCallback(async (accessToken: string | null, refreshToken: string | null) => {
    apiAccessTokenRef.current = accessToken
    apiRefreshTokenRef.current = refreshToken

    if (accessToken && refreshToken) {
      await SecureStore.setItemAsync(API_ACCESS_TOKEN_KEY, accessToken)
      await SecureStore.setItemAsync(API_REFRESH_TOKEN_KEY, refreshToken)
      return
    }

    await SecureStore.deleteItemAsync(API_ACCESS_TOKEN_KEY)
    await SecureStore.deleteItemAsync(API_REFRESH_TOKEN_KEY)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    const generation = syncGenerationRef.current + 1
    syncGenerationRef.current = generation

    const isStale = () => signal.aborted || generation !== syncGenerationRef.current

    const bootSession = async () => {
      // Only run once per app lifetime (or until explicitly reset)
      if (hasBootstrappedRef.current) {
        return
      }

      if (isSessionPending) {
        return
      }

      try {
        await clearLegacyLocalDataOnce()
        if (isStale()) return

        // Phase 1: Check if we have stored API tokens from a prior session
        const storedAccessToken = await SecureStore.getItemAsync(API_ACCESS_TOKEN_KEY)
        const storedRefreshToken = await SecureStore.getItemAsync(API_REFRESH_TOKEN_KEY)

        if (storedAccessToken) {
          apiAccessTokenRef.current = storedAccessToken
          apiRefreshTokenRef.current = storedRefreshToken
          if (isStale()) return

          // Phase 2: Validate stored token by checking identity
          try {
            const sessionResponse = await fetch(new URL('/api/auth/session', API_BASE_URL).toString(), {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedAccessToken}`,
              },
            })

            if (isStale()) return

            if (sessionResponse.ok) {
              const sessionData = (await sessionResponse.json()) as SessionResponse

              if (sessionData.isAuthenticated && sessionData.user) {
                // Token is valid! Load user and enter signed_in state
                const localUser = fromSignInUser(sessionData.user)
                const saved = await LocalStore.upsertUserProfile(localUser)
                if (isStale()) return

                if (saved) {
                  const userProfile = toAuthUserProfile(saved)
                  if (userProfile) {
                    dispatch({ type: 'SESSION_LOADED', user: userProfile })
                    hasBootstrappedRef.current = true
                    return
                  }
                }
              }
            }

            // Token validation failed (401, etc)
            if (sessionResponse.status === 401) {
              // Stored token is invalid - clear it
              await setApiTokens(null, null)
              if (isStale()) return
            }
          } catch (error) {
            console.error('[mobile-auth] token validation error', error)
            // Network error - don't clear tokens, just continue to signed_out
          }
        }

        // Phase 3: No valid stored token - check if Better Auth session exists
        // (This only happens after first boot or after explicit sign-out)
        if (!sessionUser) {
          // No Better Auth session and no stored tokens = signed out
          if (isStale()) return
          dispatch({ type: 'SESSION_EXPIRED' })
          hasBootstrappedRef.current = true
          return
        }

        // There's a Better Auth session but no API tokens
        // This can happen if:
        // 1. User just signed in via browser and switched to mobile
        // 2. App was reinstalled
        // In this case, we should NOT automatically mint tokens from Better Auth
        // Instead, we guide user back through sign-in flow
        if (isStale()) return
        dispatch({ type: 'SESSION_EXPIRED' })
        hasBootstrappedRef.current = true
      } catch (error) {
        console.error('[mobile-auth] boot session failed', error)
        if (!isStale()) {
          dispatch({
            type: 'SYNC_FAILED',
            error: error instanceof Error ? error : new Error('Boot failed'),
          })
        }
      }
    }

    void bootSession()

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [isSessionPending, setApiTokens])

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
      dispatch({ type: 'OTP_REQUEST_FAILED', error: resolvedError as Error })
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
      const error = new Error(message)
      dispatch({ type: 'OTP_REQUEST_FAILED', error })
      throw error
    }

    dispatch({ type: 'OTP_REQUESTED' })
  }, [])

  const verifyEmailOtp = useCallback(
    async (input: { email: string; otp: string; name?: string }) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, OTP_REQUEST_TIMEOUT_MS)

      try {
        dispatch({ type: 'OTP_VERIFICATION_STARTED' })

        const response = await fetch(new URL('/api/auth/email-otp/verify', API_BASE_URL).toString(), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            email: input.email,
            otp: input.otp,
            name: input.name,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          let message = 'Verification failed. Please try again.'
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

        // Single-path: API returns complete credential structure
        const signInData = (await response.json()) as SignInResponse

        if (!signInData.accessToken || !signInData.refreshToken || !signInData.user) {
          throw new Error('Invalid sign-in response from API')
        }

        // Store tokens
        await setApiTokens(signInData.accessToken, signInData.refreshToken)

        // Store user profile locally
        const localUser = fromSignInUser(signInData.user)
        const saved = await LocalStore.upsertUserProfile(localUser)

        if (!saved) {
          throw new Error('Failed to save user profile')
        }

        // Transition to signed_in
        const userProfile = toAuthUserProfile(saved)
        if (!userProfile) {
          throw new Error('Failed to create user profile')
        }
        dispatch({ type: 'SESSION_LOADED', user: userProfile })
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Sign-in failed')
        console.error('[mobile-auth] OTP verify failed', resolvedError)
        dispatch({ type: 'SYNC_FAILED', error: resolvedError })
        throw resolvedError
      } finally {
        clearTimeout(timeoutId)
      }
    },
    [setApiTokens],
  )

  const completePasskeySignIn = useCallback(
    async (input: SignInResponse) => {
      dispatch({ type: 'PASSKEY_AUTH_STARTED' })

      try {
        if (!input.accessToken || !input.refreshToken || !input.user) {
          throw new Error('Invalid passkey sign-in response from API')
        }

        await setApiTokens(input.accessToken, input.refreshToken)

        const localUser = fromSignInUser(input.user)
        const saved = await LocalStore.upsertUserProfile(localUser)
        if (!saved) {
          throw new Error('Failed to save passkey user profile')
        }

        const userProfile = toAuthUserProfile(saved)
        if (!userProfile) {
          throw new Error('Failed to create passkey user profile')
        }

        dispatch({ type: 'SESSION_LOADED', user: userProfile })
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Passkey sign-in failed')
        dispatch({ type: 'PASSKEY_AUTH_FAILED', error: resolvedError })
        throw resolvedError
      }
    },
    [setApiTokens],
  )

  const signOut = useCallback(async () => {
    try {
      // Call API sign-out to revoke tokens server-side
      const accessToken = apiAccessTokenRef.current
      if (accessToken) {
        await fetch(new URL('/api/auth/logout', API_BASE_URL).toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }).catch(() => {
          // Ignore network errors - we'll clear locally anyway
        })
      }
    } catch {
      // Best effort
    } finally {
      // Clear local state
      await setApiTokens(null, null)
      await LocalStore.clearAllData()
      dispatch({ type: 'SIGN_OUT_SUCCESS' })
    }
  }, [setApiTokens])

  const deleteAccount = useCallback(async () => {
    throw new Error('deleteAccount not yet implemented')
  }, [])

  const updateProfile = useCallback(
    async (updates: Partial<LocalUserProfile>) => {
      const current = await LocalStore.getUserProfile()
      if (!current) {
        throw new Error('No user profile to update')
      }

      const merged: LocalUserProfile = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const saved = await LocalStore.upsertUserProfile(merged)
      if (!saved) {
        throw new Error('Failed to update profile')
      }

      return saved
    },
    [],
  )

  const getAccessToken = useCallback(async () => {
    const token = apiAccessTokenRef.current

    if (!token) {
      return null
    }

    // If we have a refresh token, try to refresh if expired
    // For now, just return the token
    // Client-side token expiry check can be added here if needed
    return token
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const resetAuthForE2E = useCallback(async () => {
    if (!E2E_TESTING) {
      return
    }

    await LocalStore.clearAllData()
    await setApiTokens(null, null)
    dispatch({ type: 'RESET_TO_SIGNED_OUT' })
    hasBootstrappedRef.current = false
  }, [setApiTokens])

  const authStatus = useMemo(() => mapAuthStatus(state.status), [state.status])
  const isLoadingAuth = useMemo(() => resolveIsLoadingAuth(state), [state])
  const isSignedIn = state.status === 'signed_in'
  const currentUser = useMemo(() => {
    if (state.user) {
      return {
        id: state.user.id,
        email: state.user.email,
        name: state.user.name,
        createdAt: state.user.createdAt,
        updatedAt: state.user.updatedAt,
      }
    }
    return null
  }, [state.user])

  const value: AuthContextType = {
    authStatus,
    isLoadingAuth,
    isSignedIn,
    currentUser,
    requestEmailOtp,
    verifyEmailOtp,
    completePasskeySignIn,
    signOut,
    deleteAccount,
    updateProfile,
    getAccessToken,
    clearError,
    resetAuthForE2E,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
