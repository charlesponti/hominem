import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { AuthClient, AuthConfig, AuthContextType, HominemSession, HominemUser } from './types'

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'

interface SessionResponse {
  isAuthenticated: boolean
  user: HominemUser | null
  auth?: {
    sub: string
    sid: string
    scope: string[]
    role: 'user' | 'admin'
    amr: string[]
    authTime: number
  } | null
  accessToken?: string | null
  expiresIn?: number | null
}

interface PublicKeyCredentialDescriptorJSON {
  type: 'public-key'
  id: string
  transports?: AuthenticatorTransport[] | undefined
}

interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string
  timeout?: number | undefined
  rpId?: string | undefined
  allowCredentials?: PublicKeyCredentialDescriptorJSON[] | undefined
  userVerification?: UserVerificationRequirement | undefined
}

interface PasskeyAuthOptionsResponse {
  options?: PublicKeyCredentialRequestOptionsJSON | undefined
  challenge?: PublicKeyCredentialRequestOptionsJSON | undefined
  [key: string]: unknown
}

interface SerializedAuthenticatorAssertionResponse {
  clientDataJSON: string
  authenticatorData: string
  signature: string
  userHandle?: string | null | undefined
}

interface SerializedPublicKeyCredential {
  id: string
  rawId: string
  type: PublicKeyCredentialType
  clientExtensionResults: AuthenticationExtensionsClientOutputs
  response: SerializedAuthenticatorAssertionResponse
}

function getAbsoluteApiUrl(apiBaseUrl: string, path: string) {
  return new URL(path, apiBaseUrl).toString()
}

function toSession(accessToken?: string | null, expiresIn?: number | null): HominemSession | null {
  if (!accessToken) {
    return null
  }

  const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 600
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ttl,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }
}

async function fetchSession(apiBaseUrl: string): Promise<SessionResponse> {
  const res = await fetch(getAbsoluteApiUrl(apiBaseUrl, '/api/auth/session'), {
    method: 'GET',
    credentials: 'include',
  })

  if (!res.ok) {
    return { isAuthenticated: false, user: null, accessToken: null }
  }

  return (await res.json()) as SessionResponse
}

function buildAuthorizeUrl(
  apiBaseUrl: string,
  provider: 'apple' | 'google',
  redirectTo?: string | undefined
) {
  const redirectUri = redirectTo ?? `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`
  const url = new URL('/api/auth/authorize', apiBaseUrl)
  url.searchParams.set('provider', provider)
  url.searchParams.set('redirect_uri', redirectUri)
  return url.toString()
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const base64 = normalized + padding
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    const char = binary.charCodeAt(i)
    bytes[i] = char
  }
  return bytes.buffer
}

function normalizeRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON
): PublicKeyCredentialRequestOptions {
  return {
    challenge: fromBase64Url(options.challenge),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.rpId ? { rpId: options.rpId } : {}),
    ...(options.allowCredentials
      ? {
          allowCredentials: options.allowCredentials.map((credential) => ({
            type: 'public-key' as const,
            id: fromBase64Url(credential.id),
            ...(credential.transports ? { transports: credential.transports } : {}),
          })),
        }
      : {}),
    ...(options.userVerification ? { userVerification: options.userVerification } : {}),
  }
}

function serializeAssertion(
  credential: PublicKeyCredential
): SerializedPublicKeyCredential {
  const assertionResponse = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64Url(assertionResponse.clientDataJSON),
      authenticatorData: toBase64Url(assertionResponse.authenticatorData),
      signature: toBase64Url(assertionResponse.signature),
      ...(assertionResponse.userHandle
        ? { userHandle: toBase64Url(assertionResponse.userHandle) }
        : { userHandle: null }),
    },
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
  initialSession?: HominemSession | null
  config: AuthConfig
  onAuthEvent?: (event: AuthEvent) => void
}

export function AuthProvider({
  children,
  initialSession = null,
  config,
  onAuthEvent,
}: AuthProviderProps) {
  const [session, setSession] = useState<HominemSession | null>(initialSession)
  const [user, setUser] = useState<HominemUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAuth = useCallback(async () => {
    const payload = await fetchSession(config.apiBaseUrl)
    setUser(payload.user ?? null)
    setSession(toSession(payload.accessToken, payload.expiresIn))
    setIsLoading(false)
    return payload
  }, [config.apiBaseUrl])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  const startOAuth = useCallback(
    async (provider: 'apple' | 'google', redirectTo?: string | undefined) => {
      const url = buildAuthorizeUrl(config.apiBaseUrl, provider, redirectTo)
      window.location.href = url
    },
    [config.apiBaseUrl]
  )

  const signInWithApple = useCallback(async () => {
    await startOAuth('apple', config.redirectTo)
  }, [config.redirectTo, startOAuth])

  const signIn = useCallback(async () => {
    await signInWithApple()
  }, [signInWithApple])

  const linkGoogle = useCallback(async () => {
    const redirectTo = config.redirectTo ?? `${window.location.origin}/account`
    const url = new URL('/api/auth/link/google/start', config.apiBaseUrl)
    url.searchParams.set('redirect_uri', redirectTo)
    window.location.href = url.toString()
  }, [config.apiBaseUrl, config.redirectTo])

  const requireStepUp = useCallback(
    async (action: string) => {
      if (typeof window === 'undefined' || !window.PublicKeyCredential) {
        throw new Error('Passkeys are not available in this environment.')
      }

      const optionsRes = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/options'), {
        method: 'POST',
        credentials: 'include',
      })
      if (!optionsRes.ok) {
        throw new Error('Failed to request passkey authentication options.')
      }

      const optionsPayload = (await optionsRes.json()) as PasskeyAuthOptionsResponse
      const rawOptions =
        optionsPayload.options && typeof optionsPayload.options === 'object'
          ? optionsPayload.options
          : optionsPayload.challenge && typeof optionsPayload.challenge === 'object'
            ? optionsPayload.challenge
            : null

      if (!rawOptions || typeof rawOptions.challenge !== 'string') {
        throw new Error('Invalid passkey options response.')
      }

      const credential = (await navigator.credentials.get({
        publicKey: normalizeRequestOptions(rawOptions),
      })) as PublicKeyCredential | null
      if (!credential) {
        throw new Error('Passkey authentication was cancelled.')
      }

      const verifyRes = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/passkey/auth/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          response: serializeAssertion(credential),
          action,
        }),
      })

      if (!verifyRes.ok) {
        throw new Error('Passkey step-up verification failed.')
      }
    },
    [config.apiBaseUrl]
  )

  const unlinkGoogle = useCallback(async () => {
    await requireStepUp('google_unlink')
    const response = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/link/google/unlink'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      throw new Error('Failed to unlink Google account.')
    }
  }, [config.apiBaseUrl, requireStepUp])

  const signOut = useCallback(async () => {
    await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
    setSession(null)
    onAuthEvent?.('SIGNED_OUT')
  }, [config.apiBaseUrl, onAuthEvent])

  const getSession = useCallback(async () => {
    const payload = await refreshAuth()
    return toSession(payload.accessToken, payload.expiresIn)
  }, [refreshAuth])

  const authClient = useMemo<AuthClient>(
    () => ({
      auth: {
        signInWithOAuth: async ({ provider, options }) => {
          try {
            await startOAuth(provider, options?.redirectTo)
            return { error: null }
          } catch (error) {
            return { error: error instanceof Error ? error : new Error('OAuth redirect failed') }
          }
        },
        signOut: async () => {
          try {
            await signOut()
            return { error: null }
          } catch (error) {
            return { error: error instanceof Error ? error : new Error('Sign out failed') }
          }
        },
        getSession: async () => {
          try {
            const current = await getSession()
            return { data: { session: current }, error: null }
          } catch (error) {
            return {
              data: { session: null },
              error: error instanceof Error ? error : new Error('Failed to get session'),
            }
          }
        },
      },
    }),
    [getSession, signOut, startOAuth]
  )

  useEffect(() => {
    if (!session) {
      return
    }
    onAuthEvent?.('TOKEN_REFRESHED')
  }, [onAuthEvent, session])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: Boolean(user && session),
      signIn,
      signInWithApple,
      linkGoogle,
      unlinkGoogle,
      signOut,
      getSession,
      requireStepUp,
      logout: signOut,
      authClient,
      userId: user?.id,
    }),
    [
      user,
      session,
      isLoading,
      signIn,
      signInWithApple,
      linkGoogle,
      unlinkGoogle,
      signOut,
      getSession,
      requireStepUp,
      authClient,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
