import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { useRouter } from 'expo-router'
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
import { signInWithE2eCredentials } from './auth-e2e'
import { E2E_TESTING } from './constants'

WebBrowser.maybeCompleteAuthSession()

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'

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
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  const { data: session, isPending: isLoadingAuth } = authClient.useSession()

  const syncUserFromSession = useCallback(async () => {
    if (!session?.user) {
      setCurrentUser(null)
      return null
    }

    await clearLegacyLocalDataOnce()

    const local = await LocalStore.getUserProfile()
    const merged: UserProfile = {
      ...toUserProfile(session.user),
      ...local,
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
      updatedAt: nowIso(),
    }

    const saved = await LocalStore.upsertUserProfile(merged)
    setCurrentUser(saved)
    return saved
  }, [session])

  useEffect(() => {
    if (session?.user) {
      void syncUserFromSession()
    } else if (!session && !isLoadingAuth) {
      setCurrentUser(null)
    }
  }, [session, isLoadingAuth, syncUserFromSession])

  const signInWithApple = useCallback(async () => {
    if (E2E_TESTING) {
      await signInWithE2eCredentials()
      router.replace('/(drawer)/(tabs)/start')
      return
    }
    await authClient.signIn.social({
      provider: 'apple',
      callbackURL: '/',
    })
  }, [router])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    await LocalStore.clearAllData()
    setCurrentUser(null)
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
    return session.user.id
  }, [session])

  const value = useMemo(
    () => ({
      isLoadingAuth,
      isSignedIn: Boolean(session?.user && currentUser),
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
