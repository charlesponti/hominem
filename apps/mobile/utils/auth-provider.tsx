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
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

import { LocalStore } from './local-store'
import type { UserProfile } from './local-store/types'
import {
  exchangeAuthCodeFromUrl,
  getMobileRedirectUri,
  getSupabaseMobileClient,
} from './supabase-mobile'
import { E2E_TESTING } from './constants'

WebBrowser.maybeCompleteAuthSession()

const LOCAL_MIGRATION_KEY = 'hominem_mobile_local_migration_v1'

type AuthContextType = {
  isLoadingAuth: boolean
  isSignedIn: boolean
  currentUser: UserProfile | null
  session: Session | null
  supabaseUser: User | null
  signInWithApple: () => Promise<void>
  signInWithTestCredentials?: (email: string, password: string) => Promise<void>
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

const mapSupabaseUserToProfile = (user: User): UserProfile => ({
  id: user.id,
  name:
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null,
  email: user.email ?? null,
  createdAt: user.created_at ?? nowIso(),
  updatedAt: nowIso(),
})

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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)

  const supabase = useMemo(() => getSupabaseMobileClient(), [])

  const hydrateFromSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession)
      setSupabaseUser(nextSession?.user ?? null)

      if (!nextSession?.user) {
        setCurrentUser(null)
        return
      }

      await clearLegacyLocalDataOnce()

      const local = await LocalStore.getUserProfile()
      const profile = {
        ...mapSupabaseUserToProfile(nextSession.user),
        ...(local ?? {}),
        id: nextSession.user.id,
        email: nextSession.user.email ?? null,
        updatedAt: nowIso(),
      }

      await LocalStore.upsertUserProfile(profile)
      setCurrentUser(profile)
    },
    []
  )

  useEffect(() => {
    let isMounted = true

    LocalStore.initialize()
      .then(async () => {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return
        await hydrateFromSession(data.session)
        setIsLoadingAuth(false)
      })
      .catch(() => {
        if (!isMounted) return
        setIsLoadingAuth(false)
      })

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, nextSession: Session | null) => {
        await hydrateFromSession(nextSession)
      }
    )

    return () => {
      isMounted = false
      authSubscription.subscription.unsubscribe()
    }
  }, [hydrateFromSession, supabase])

  const signInWithApple = useCallback(async () => {
    const redirectTo = getMobileRedirectUri()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    })

    if (error) {
      throw error
    }

    const authUrl = data?.url
    if (!authUrl) {
      throw new Error('Supabase did not return OAuth authorization URL')
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo)

    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        const canceled = new Error('OAuth sign-in cancelled')
        canceled.name = 'ERR_REQUEST_CANCELED'
        throw canceled
      }
      throw new Error('OAuth sign-in failed')
    }

    await exchangeAuthCodeFromUrl(result.url)
    router.replace('/(drawer)/(tabs)/start')
  }, [router, supabase])

  const signInWithTestCredentials = useCallback(
    async (email: string, password: string) => {
      if (!E2E_TESTING) {
        throw new Error('Test auth is only available in E2E builds')
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      await hydrateFromSession(data.session)
      router.replace('/(drawer)/(tabs)/start')
    },
    [hydrateFromSession, router, supabase]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    await LocalStore.clearAllData()
    setCurrentUser(null)
  }, [supabase])

  const deleteAccount = useCallback(async () => {
    // Deletion endpoint is currently not implemented server-side (501).
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

      const { error } = await supabase.auth.updateUser({
        data: {
          name: merged.name,
          full_name: merged.name,
        },
      })

      if (error) {
        throw error
      }

      const saved = await LocalStore.upsertUserProfile(merged)
      setCurrentUser(saved)
      return saved
    },
    [currentUser, supabase]
  )

  const getAccessToken = useCallback(async () => {
    const {
      data: { session: activeSession },
    } = await supabase.auth.getSession()

    return activeSession?.access_token ?? null
  }, [supabase])

  const value = useMemo(
    () => ({
      isLoadingAuth,
      isSignedIn: Boolean(session?.user),
      currentUser,
      session,
      supabaseUser,
      signInWithApple,
      signInWithTestCredentials: E2E_TESTING ? signInWithTestCredentials : undefined,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
    }),
    [
      isLoadingAuth,
      currentUser,
      session,
      supabaseUser,
      signInWithApple,
      signInWithTestCredentials,
      signOut,
      deleteAccount,
      updateProfile,
      getAccessToken,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
