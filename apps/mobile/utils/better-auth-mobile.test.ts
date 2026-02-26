import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test'

mock.module('./constants', () => ({
  API_BASE_URL: 'https://auth.ponti.io',
  E2E_AUTH_SECRET: 'test-secret',
}))

mock.module('expo-auth-session', () => ({
  makeRedirectUri: () => 'mindsherpa://auth/callback',
}))

mock.module('expo-secure-store', () => ({
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}))

mock.module('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
  digestStringAsync: async () => 'digest',
  randomUUID: () => '11111111-1111-1111-1111-111111111111',
}))

type BetterAuthMobileModule = typeof import('./better-auth-mobile')

let mobileAuth: BetterAuthMobileModule
const originalFetch = globalThis.fetch

beforeAll(async () => {
  mobileAuth = await import('./better-auth-mobile')
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('better-auth-mobile token flows', () => {
  test('rejects OAuth state mismatch before token exchange request', async () => {
    await expect(
      mobileAuth.exchangeMobileAuthCode({
        callbackUrl: 'mindsherpa://auth/callback?state=wrong&code=code-123',
        codeVerifier: 'v'.repeat(64),
        expectedState: 'expected',
      }),
    ).rejects.toThrow('OAuth state mismatch')
  })

  test('maps successful exchange response to mobile token pair', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          token_type: 'Bearer',
          expires_in: 600,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as typeof fetch

    const tokenPair = await mobileAuth.exchangeMobileAuthCode({
      callbackUrl: 'mindsherpa://auth/callback?state=expected&code=code-123',
      codeVerifier: 'v'.repeat(64),
      expectedState: 'expected',
    })

    expect(tokenPair.accessToken).toBe('access-1')
    expect(tokenPair.refreshToken).toBe('refresh-1')
    expect(tokenPair.expiresIn).toBe(600)
  })

  test('throws on refresh endpoint failure status', async () => {
    globalThis.fetch = (async () => new Response('denied', { status: 401 })) as typeof fetch

    await expect(mobileAuth.refreshMobileToken('bad-refresh')).rejects.toThrow(
      'Refresh token request failed (401)',
    )
  })
})
