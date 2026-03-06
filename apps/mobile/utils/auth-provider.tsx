import * as SecureStore from 'expo-secure-store'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { authClient } from '../lib/auth-client'
import { LocalStore } from './local-store'
import type { UserProfile } from './local-store/types'
import { API_BASE_URL } from './constants'

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'
const AUTH_BOOT_TIMEOUT_MS = 6000

type AuthStatus = 'booting' | 'signed_out' | 'signed_in' | 'degraded'
type SessionWithToken = {
  session?: {
    token?: string | null
    accessToken?: string | null
  } | null
}

type AuthContextType = {
  authStatus: AuthStatus
  isLoadingAuth: boolean
  isSignedIn: boolean
  currentUser: UserProfile | null
  requestEmailOtp: (email: string) => Promise<void>
  verifyEmailOtp: (input: { email: string; otp: string; name?: string }) => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

const nowIso = () => new Date().toISOString()

function toUserProfile(input: {
  id: string
  email?: string | null
  name?: string | null
  createdAt?: Date | string | undefined
  updatedAt?: Date | string | undefined
}): UserProfile {
  const toIso = (date: unknown): string => {
    if (!date) return nowIso()
    if (typeof date === 'string') return date
    if (date instanceof Date) return date.toISOString()
    return nowIso()
  }

  return {
    id: input.id,
    email: input.email ?? null,
    name: input.name ?? null,
    createdAt: toIso(input.createdAt),
    updatedAt: toIso(input.updatedAt),
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

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('booting')

  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const sessionUser = session?.user ?? null
  const sessionFingerprint = sessionUser
    ? `${sessionUser.id}|${sessionUser.email ?? ''}|${sessionUser.name ?? ''}|${String(sessionUser.updatedAt ?? '')}`
    : 'none'

  const syncUserFromSession = useCallback(async (user: NonNullable<typeof sessionUser>) => {
    await clearLegacyLocalDataOnce()

    const local = await LocalStore.getUserProfile()
    const merged: UserProfile = {
      ...toUserProfile(user),
      ...local,
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      updatedAt: nowIso(),
    }

    const saved = await LocalStore.upsertUserProfile(merged)
    setCurrentUser(saved)
    return saved
  }, [])

  useEffect(() => {
    let isCancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      if (isSessionPending) {
        setAuthStatus('booting')
        timeoutId = setTimeout(() => {
          if (!isCancelled) {
            setAuthStatus('degraded')
          }
        }, AUTH_BOOT_TIMEOUT_MS)
        return
      }

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (!sessionUser) {
        setCurrentUser(null)
        setAuthStatus('signed_out')
        return
      }

      try {
        await syncUserFromSession(sessionUser)
        if (!isCancelled) {
          setAuthStatus('signed_in')
        }
      } catch (error) {
        console.error('[mobile-auth] session sync failed', error)
        if (!isCancelled) {
          setCurrentUser(null)
          setAuthStatus('degraded')
        }
      }
    }

    void run()

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [isSessionPending, sessionFingerprint, sessionUser, syncUserFromSession])

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
  }, [])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    await LocalStore.clearAllData()
    setCurrentUser(null)
    setAuthStatus('signed_out')
  }, [])

  const deleteAccount = useCallback(async () => {
    throw new Error('Account deletion is not available yet.')
  }, [])

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!currentUser) {
        throw new Error('No user profile found')
      }
      const merged: UserProfile = {
        ...currentUser,
        ...updates,
        updatedAt: nowIso(),
      }
      const saved = await LocalStore.upsertUserProfile(merged)
      setCurrentUser(saved)
      return saved
    },
    [currentUser]
  )

  const getAccessToken = useCallback(async () => {
    if (!session?.user) {
      return null
    }
    const maybeSession = session as SessionWithToken | null
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

  const isLoadingAuth = authStatus === 'booting'
  const isSignedIn = authStatus === 'signed_in'

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
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
