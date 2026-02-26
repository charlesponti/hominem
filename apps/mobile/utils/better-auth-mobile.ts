import * as SecureStore from 'expo-secure-store'
import { makeRedirectUri } from 'expo-auth-session'
import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync, randomUUID } from 'expo-crypto'

import { API_BASE_URL, E2E_AUTH_SECRET } from './constants'
import { parseMobileAuthCallback } from './mobile-auth-callback'

const SECURE_STORE_REFRESH_TOKEN_KEY = 'hominem.auth.refresh_token'
const MOBILE_CALLBACK_PATH = 'auth/callback'

const BASE64URL_FROM_BASE64_REGEX = /\+/g
const BASE64URL_FROM_BASE64_SLASH_REGEX = /\//g
const BASE64URL_FROM_BASE64_PADDING_REGEX = /=+$/

export interface MobileTokenPair {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface MobileSessionUser {
  id: string
  email?: string | null
  name?: string | null
  image?: string | null
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

interface MobileAuthorizeResponse {
  authorization_url: string
}

interface MobileExchangeResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface MobileE2eLoginResponse extends MobileExchangeResponse {
  session_id: string
  refresh_family_id: string
  provider: 'better-auth'
}

interface MobileSessionResponse {
  isAuthenticated: boolean
  user: MobileSessionUser | null
}

interface ApiErrorPayload {
  error?: string
  message?: string
}

function toBase64Url(value: string) {
  return value
    .replace(BASE64URL_FROM_BASE64_REGEX, '-')
    .replace(BASE64URL_FROM_BASE64_SLASH_REGEX, '_')
    .replace(BASE64URL_FROM_BASE64_PADDING_REGEX, '')
}

async function generatePkcePair() {
  const verifier = `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`
  const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: CryptoEncoding.BASE64,
  })

  return {
    verifier,
    challenge: toBase64Url(digest),
    state: randomUUID().replaceAll('-', ''),
  }
}

function buildApiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString()
}

function toTokenPair(payload: MobileExchangeResponse): MobileTokenPair {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    expiresIn: payload.expires_in,
  }
}

function toErrorDetail(payload: ApiErrorPayload | null) {
  if (!payload) {
    return null
  }

  if (payload.error && payload.message) {
    return `${payload.error}: ${payload.message}`
  }

  if (payload.message) {
    return payload.message
  }

  if (payload.error) {
    return payload.error
  }

  return null
}

async function getResponseErrorDetail(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
    const detail = toErrorDetail(payload)
    if (detail) {
      return detail
    }
  }

  const bodyText = await response.text().catch(() => '')
  const trimmed = bodyText.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, 220)
}

async function throwRequestError(label: string, response: Response) {
  const detail = await getResponseErrorDetail(response)
  if (detail) {
    throw new Error(`${label} failed (${response.status}): ${detail}`)
  }

  throw new Error(`${label} failed (${response.status})`)
}

export function getMobileRedirectUri() {
  return makeRedirectUri({
    path: MOBILE_CALLBACK_PATH,
  })
}

export async function startAppleMobileAuth(): Promise<{
  authorizationUrl: string
  codeVerifier: string
  state: string
}> {
  const redirectUri = getMobileRedirectUri()
  const pkce = await generatePkcePair()

  const response = await fetch(buildApiUrl('/api/auth/mobile/authorize'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      redirect_uri: redirectUri,
      code_challenge: pkce.challenge,
      state: pkce.state,
    }),
  })

  if (!response.ok) {
    await throwRequestError('Mobile authorize', response)
  }

  const payload = (await response.json()) as MobileAuthorizeResponse
  if (!payload.authorization_url) {
    throw new Error('Mobile authorize response did not include authorization URL')
  }

  return {
    authorizationUrl: payload.authorization_url,
    codeVerifier: pkce.verifier,
    state: pkce.state,
  }
}

export async function exchangeMobileAuthCode(input: {
  callbackUrl: string
  codeVerifier: string
  expectedState: string
}): Promise<MobileTokenPair> {
  const redirectUri = getMobileRedirectUri()
  const { code } = parseMobileAuthCallback({
    callbackUrl: input.callbackUrl,
    expectedRedirectUri: redirectUri,
    expectedState: input.expectedState,
  })

  const response = await fetch(buildApiUrl('/api/auth/mobile/exchange'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      code,
      code_verifier: input.codeVerifier,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    await throwRequestError('Mobile token exchange', response)
  }

  return toTokenPair((await response.json()) as MobileExchangeResponse)
}

export async function refreshMobileToken(refreshToken: string): Promise<MobileTokenPair> {
  const response = await fetch(buildApiUrl('/api/auth/token'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    await throwRequestError('Refresh token request', response)
  }

  return toTokenPair((await response.json()) as MobileExchangeResponse)
}

export async function signInMobileE2e(input?: {
  email?: string
  name?: string
}): Promise<MobileTokenPair> {
  if (!E2E_AUTH_SECRET) {
    throw new Error('Missing EXPO_PUBLIC_E2E_AUTH_SECRET for E2E mobile login')
  }

  const response = await fetch(buildApiUrl('/api/auth/mobile/e2e/login'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-e2e-auth-secret': E2E_AUTH_SECRET,
    },
    body: JSON.stringify({
      email: input?.email ?? 'mobile-e2e@hominem.local',
      name: input?.name ?? 'Mobile E2E User',
    }),
  })

  if (!response.ok) {
    await throwRequestError('Mobile E2E login', response)
  }

  return toTokenPair((await response.json()) as MobileE2eLoginResponse)
}

export async function fetchMobileSessionUser(accessToken: string): Promise<MobileSessionUser | null> {
  const response = await fetch(buildApiUrl('/api/auth/session'), {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as MobileSessionResponse
  if (!payload.isAuthenticated) {
    return null
  }

  return payload.user
}

export async function persistMobileRefreshToken(refreshToken: string) {
  await SecureStore.setItemAsync(SECURE_STORE_REFRESH_TOKEN_KEY, refreshToken)
}

export async function getPersistedMobileRefreshToken() {
  return SecureStore.getItemAsync(SECURE_STORE_REFRESH_TOKEN_KEY)
}

export async function clearPersistedMobileRefreshToken() {
  await SecureStore.deleteItemAsync(SECURE_STORE_REFRESH_TOKEN_KEY)
}

export async function revokeMobileRefreshToken(refreshToken: string) {
  await fetch(buildApiUrl('/api/auth/revoke'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }),
  }).catch(() => {
    return null
  })
}
