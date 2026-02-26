import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { useRouter } from 'expo-router'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import { LocalStore } from './local-store'
import type { UserProfile } from './local-store/types'
import {
  clearPersistedMobileRefreshToken,
  exchangeMobileAuthCode,
  fetchMobileSessionUser,
  getMobileRedirectUri,
  getPersistedMobileRefreshToken,
  persistMobileRefreshToken,
  refreshMobileToken,
  revokeMobileRefreshToken,
  signInMobileE2e,
  startAppleMobileAuth,
  type MobileTokenPair,
} from './better-auth-mobile'
import { E2E_TESTING } from './constants'
import { extractSuccessfulAuthCallbackUrl } from './auth-provider-result'

WebBrowser.maybeCompleteAuthSession()

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'

interface MobileSessionState {
  accessToken: string
  tokenType: string
  expiresAtMs: number
  expiresInSeconds: number
}

type AuthContextType = {
  isLoadingAuth: boolean
  isSignedIn: boolean
  currentUser: UserProfile | null
  signInWithApple: () => Promise<void>
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
const REFRESH_PROACTIVE_WINDOW_MS = 120_000
const REFRESH_JITTER_MS = 30_000

function toSessionState(pair: MobileTokenPair): MobileSessionState {
  return {
    accessToken: pair.accessToken,
    tokenType: pair.tokenType,
    expiresInSeconds: pair.expiresIn,
    expiresAtMs: Date.now() + pair.expiresIn * 1000,
  }
}

function toUserProfile(input: {
  id: string
  email?: string | null
  name?: string | null
  createdAt?: string | undefined
  updatedAt?: string | undefined
}): UserProfile {
  return {
    id: input.id,
    email: input.email ?? null,
    name: input.name ?? null,
    createdAt: input.createdAt ?? nowIso(),
    updatedAt: input.updatedAt ?? nowIso(),
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
  const router = useRouter()
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTokenRef = useRef<string | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<MobileSessionState | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  const scheduleRefresh = useCallback(
    (nextSession: MobileSessionState | null, refreshFn: () => Promise<unknown>) => {
      clearRefreshTimer()
      if (!nextSession) {
        return
      }

      const jitter = Math.floor(Math.random() * REFRESH_JITTER_MS)
      const refreshAt = nextSession.expiresAtMs - REFRESH_PROACTIVE_WINDOW_MS - jitter
      const delayMs = Math.max(1_000, refreshAt - Date.now())

      refreshTimeoutRef.current = setTimeout(() => {
        void refreshFn()
      }, delayMs)
    },
    [clearRefreshTimer]
  )

  const syncUserFromAccessToken = useCallback(async (accessToken: string) => {
    const user = await fetchMobileSessionUser(accessToken)
    if (!user) {
      setCurrentUser(null)
      return null
    }

    await clearLegacyLocalDataOnce()

    const local = await LocalStore.getUserProfile()
    const merged: UserProfile = {
      ...toUserProfile(user),
      ...(local ?? {}),
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      updatedAt: nowIso(),
    }

    const saved = await LocalStore.upsertUserProfile(merged)
    setCurrentUser(saved)
    return saved
  }, [])

  const applyTokenPair = useCallback(
    async (pair: MobileTokenPair) => {
      const nextSession = toSessionState(pair)
      refreshTokenRef.current = pair.refreshToken
      await persistMobileRefreshToken(pair.refreshToken)
      setSession(nextSession)
      await syncUserFromAccessToken(pair.accessToken)
      return nextSession
    },
    [syncUserFromAccessToken]
  )

  const refreshFromStoredToken = useCallback(async () => {
    const activeRefreshToken = refreshTokenRef.current
    if (!activeRefreshToken) {
      throw new Error('No refresh token available')
    }

    const pair = await refreshMobileToken(activeRefreshToken)
    return applyTokenPair(pair)
  }, [applyTokenPair])

  useEffect(() => {
    let isMounted = true

    LocalStore.initialize()
      .then(async () => {
        const storedRefreshToken = await getPersistedMobileRefreshToken()
        if (!isMounted) {
          return
        }

        refreshTokenRef.current = storedRefreshToken

        if (!storedRefreshToken) {
          setSession(null)
          setCurrentUser(null)
          setIsLoadingAuth(false)
          return
        }

        try {
          const pair = await refreshMobileToken(storedRefreshToken)
          if (!isMounted) {
            return
          }
          const nextSession = await applyTokenPair(pair)
          if (!isMounted) {
            return
          }
          scheduleRefresh(nextSession, refreshFromStoredToken)
        } catch {
          await clearPersistedMobileRefreshToken()
          refreshTokenRef.current = null
          if (!isMounted) {
            return
          }
          setSession(null)
          setCurrentUser(null)
        } finally {
          if (isMounted) {
            setIsLoadingAuth(false)
          }
        }
      })
      .catch(() => {
        if (!isMounted) {
          return
        }
        setIsLoadingAuth(false)
      })

    return () => {
      isMounted = false
      clearRefreshTimer()
    }
  }, [applyTokenPair, clearRefreshTimer, refreshFromStoredToken, scheduleRefresh])

  const signInWithApple = useCallback(async () => {
    if (E2E_TESTING) {
      const pair = await signInMobileE2e()
      const nextSession = await applyTokenPair(pair)
      scheduleRefresh(nextSession, refreshFromStoredToken)
      router.replace('/(drawer)/(tabs)/start')
      return
    }

    const { authorizationUrl, codeVerifier, state } = await startAppleMobileAuth()
    const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, getMobileRedirectUri())
    const callbackUrl = extractSuccessfulAuthCallbackUrl(result)

    const pair = await exchangeMobileAuthCode({
      callbackUrl,
      codeVerifier,
      expectedState: state,
    })

    const nextSession = await applyTokenPair(pair)
    scheduleRefresh(nextSession, refreshFromStoredToken)
    router.replace('/(drawer)/(tabs)/start')
  }, [applyTokenPair, refreshFromStoredToken, router, scheduleRefresh])

  const signOut = useCallback(async () => {
    const activeRefreshToken = refreshTokenRef.current
    if (activeRefreshToken) {
      await revokeMobileRefreshToken(activeRefreshToken)
    }

    refreshTokenRef.current = null
    await clearPersistedMobileRefreshToken()
    await LocalStore.clearAllData()
    clearRefreshTimer()
    setSession(null)
    setCurrentUser(null)
  }, [clearRefreshTimer])

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
    if (!session) {
      return null
    }

    const msUntilExpiry = session.expiresAtMs - Date.now()
    if (msUntilExpiry <= 60_000 && refreshTokenRef.current) {
      try {
        const nextSession = await refreshFromStoredToken()
        scheduleRefresh(nextSession, refreshFromStoredToken)
        return nextSession.accessToken
      } catch {
        return null
      }
    }

    return session.accessToken
  }, [refreshFromStoredToken, scheduleRefresh, session])

  const value = useMemo(
    () => ({
      isLoadingAuth,
      isSignedIn: Boolean(session?.accessToken && currentUser),
      currentUser,
      signInWithApple,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
    }),
    [
      isLoadingAuth,
      session,
      currentUser,
      signInWithApple,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
