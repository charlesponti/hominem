/**
 * E2E Testing Helpers
 * 
 * This module provides E2E-specific authentication helpers.
 * Used only in development/E2E testing modes when EXPO_PUBLIC_E2E_TESTING=true.
 */

import { E2E_AUTH_SECRET, API_BASE_URL } from './constants'

function buildApiUrl(path: string) {
  return new URL(path, API_BASE_URL).toString()
}

interface MobileExchangeResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

async function throwRequestError(label: string, response: Response) {
  let errorMessage = `${label}: ${response.status} ${response.statusText}`
  try {
    const json = await response.json()
    const message = (json as Record<string, unknown>).message
    if (typeof message === 'string') {
      errorMessage = `${label}: ${message}`
    }
  } catch {
    // Ignore JSON parse errors
  }
  throw new Error(errorMessage)
}

/**
 * E2E Testing: Sign in with deterministic credentials.
 * 
 * Uses `/api/auth/mobile/e2e/login` endpoint which bypasses OAuth.
 * Only available when EXPO_PUBLIC_E2E_TESTING=true and EXPO_PUBLIC_E2E_AUTH_SECRET is set.
 */
export async function signInWithE2eCredentials(input?: {
  email?: string
  name?: string
}): Promise<void> {
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

  // The authClient plugin will handle token storage via secure store
  // Response contains access_token, refresh_token, etc.
  const payload = (await response.json()) as MobileExchangeResponse
  
  // Note: In a real E2E setup, we'd need to set these tokens in secure storage
  // For now, the API response handles this via cookie-based flow
  console.log('[E2E] Signed in with:', { email: input?.email })
}
