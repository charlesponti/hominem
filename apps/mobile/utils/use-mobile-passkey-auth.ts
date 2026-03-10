import { useCallback, useState } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { getCookie } from '@better-auth/expo/client'

import { STEP_UP_ACTIONS } from '@hominem/auth/step-up-actions'

import { authClient } from '~/lib/auth-client'
import { API_BASE_URL, E2E_AUTH_SECRET, E2E_TESTING } from '~/utils/constants'
import { useAuth } from '~/utils/auth-provider'

// The expo client stores Better Auth cookies under this key in SecureStore.
// Must match the storagePrefix used in auth-client.ts.
const BETTER_AUTH_COOKIE_KEY = 'hominem_cookie'

interface PasskeySignInResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
  user: {
    id: string
    email: string
    name?: string
  }
}

interface UseMobilePasskeyAuthReturn {
  signIn: (mode?: 'real' | 'e2e-success' | 'e2e-cancel') => Promise<PasskeySignInResult | null>
  addPasskey: (name?: string) => Promise<{ success: boolean; error?: string }>
  listPasskeys: () => Promise<{ id: string; name: string }[]>
  deletePasskey: (id: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
  isSupported: boolean
}

export function useMobilePasskeyAuth(): UseMobilePasskeyAuthReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getAccessToken } = useAuth()

  // Passkeys require iOS 16+. Earlier versions and non-iOS platforms are not supported.
  const isSupported = Platform.OS === 'ios' && Number.parseInt(Platform.Version as string, 10) >= 16

  const signIn = useCallback(async (mode: 'real' | 'e2e-success' | 'e2e-cancel' = 'real'): Promise<PasskeySignInResult | null> => {
    setIsLoading(true)
    setError(null)

    try {
      if (E2E_TESTING && mode !== 'real') {
        if (mode === 'e2e-cancel') {
          const message = 'Passkey sign-in was cancelled'
          setError(message)
          return null
        }

        const email = `mobile-passkey-${Date.now()}@hominem.test`
        const response = await fetch(new URL('/api/auth/mobile/e2e/login', API_BASE_URL).toString(), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-e2e-auth-secret': E2E_AUTH_SECRET,
          },
          body: JSON.stringify({
            email,
            name: 'Mobile Passkey E2E User',
            amr: ['passkey', 'e2e', 'mobile'],
          }),
        })

        if (!response.ok) {
          const body = (await response.json()) as { error?: string }
          setError(body.error || 'Failed to complete E2E passkey sign-in')
          return null
        }

        const payload = (await response.json()) as {
          access_token: string
          refresh_token: string
          expires_in: number
          token_type: 'Bearer'
          user?: {
            id: string
            email: string
            name?: string
          }
        }

        return {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token,
          expiresIn: payload.expires_in,
          tokenType: payload.token_type,
          user: payload.user ?? {
            id: `mobile-passkey-${Date.now()}`,
            email,
            name: 'Mobile Passkey E2E User',
          },
        }
      }

      // Step 1: Sign in with passkey via Better Auth (handles native platform credential APIs).
      // On iOS this triggers the system passkey prompt. expoClient stores the
      // resulting Better Auth session in SecureStore automatically.
      const { data: passkeyData, error: passkeyError } = await authClient.signIn.passkey()

      if (passkeyError) {
        setError(passkeyError.message || 'Passkey sign-in failed')
        return null
      }

      if (!passkeyData) {
        setError('No data returned from passkey sign-in')
        return null
      }

      // Step 2: Exchange the Better Auth session for canonical Hominem app tokens.
      // Read the session cookie that expoClient stored in SecureStore.
      const cookieStorageValue = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY)
      const cookieHeader = cookieStorageValue ? getCookie(cookieStorageValue) : null

      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (cookieHeader) {
        headers['cookie'] = cookieHeader
      }

      const tokenResponse = await fetch(
        new URL('/api/auth/token-from-session', API_BASE_URL).toString(),
        {
          method: 'POST',
          headers,
        },
      )

      if (!tokenResponse.ok) {
        const body = (await tokenResponse.json()) as { error?: string }
        setError(body.error || 'Failed to obtain app tokens after passkey sign-in')
        return null
      }

      const result = (await tokenResponse.json()) as PasskeySignInResult

      if (!result.accessToken) {
        setError('Server did not return an access token')
        return null
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Passkey sign-in failed'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addPasskey = useCallback(
    async (name?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const { error: passkeyError } = await authClient.passkey.addPasskey({
          name,
        })

        if (passkeyError) {
          setError(passkeyError.message || 'Failed to add passkey')
          return { success: false, error: passkeyError.message }
        }

        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add passkey'
        setError(message)
        return { success: false, error: message }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const listPasskeys = useCallback(async () => {
    try {
      const token = await getAccessToken()
      if (!token) return []

      const response = await fetch(new URL('/api/auth/passkeys', API_BASE_URL).toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return []

      const data = (await response.json()) as { id: string; name?: string | null }[]
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name ?? 'Unnamed passkey',
      }))
    } catch {
      return []
    }
  }, [getAccessToken])

  const deletePasskey = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      let token = await getAccessToken()
      if (!token) {
        setError('Not authenticated')
        return { success: false, error: 'Not authenticated' }
      }

      const requestDelete = async (accessToken: string) => {
        return fetch(new URL('/api/auth/passkey/delete', API_BASE_URL).toString(), {
          method: 'DELETE',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ id }),
        })
      }

      let response = await requestDelete(token)

      if (response.status === 403) {
        const body = (await response.json()) as { error?: string; action?: string }
        if (body.error === 'step_up_required' && body.action === STEP_UP_ACTIONS.PASSKEY_DELETE) {
          const stepUpResult = await signIn('real')
          if (!stepUpResult?.accessToken) {
            const message = 'Passkey step-up required'
            setError(message)
            return { success: false, error: message }
          }

          token = stepUpResult.accessToken
          response = await requestDelete(token)
        } else {
          const message = body.error ?? 'Failed to delete passkey'
          setError(message)
          return { success: false, error: message }
        }
      }

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        const message = body.error ?? 'Failed to delete passkey'
        setError(message)
        return { success: false, error: message }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete passkey'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken])

  return {
    signIn,
    addPasskey,
    listPasskeys,
    deletePasskey,
    isLoading,
    error,
    isSupported,
  }
}
