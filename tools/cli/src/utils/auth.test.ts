import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

const loadTokensMock = mock()
const saveTokensMock = mock()
const clearTokensMock = mock()
const openMock = mock()

mock.module('./secure-store', () => ({
  SecureStoreError: class SecureStoreError extends Error {},
  loadTokens: loadTokensMock,
  saveTokens: saveTokensMock,
  clearTokens: clearTokensMock,
}))

mock.module('open', () => ({
  default: openMock,
}))

const { deviceCodeLogin, getAccessToken, interactiveLogin } = await import('./auth')

describe('cli auth utils', () => {
  let fetchMock: ReturnType<typeof mock>
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    loadTokensMock.mockReset()
    saveTokensMock.mockReset()
    clearTokensMock.mockReset()
    openMock.mockReset()
    openMock.mockResolvedValue(undefined)

    fetchMock = mock()
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('getAccessToken returns stored Better Auth bearer without refresh exchange', async () => {
    loadTokensMock.mockResolvedValueOnce({
      accessToken: 'stored-bearer',
      expiresAt: new Date(Date.now() - 5_000).toISOString(),
      tokenVersion: 2,
      provider: 'better-auth',
      scopes: ['cli:read'],
      issuerBaseUrl: 'http://localhost:4040',
    })

    const token = await getAccessToken()

    expect(token).toBe('stored-bearer')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(saveTokensMock).not.toHaveBeenCalled()
  })

  test('getAccessToken throws when issuer mismatches requested base', async () => {
    loadTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      issuerBaseUrl: 'http://localhost:4040',
    })

    await expect(
      getAccessToken({
        expectedIssuerBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toThrow('does not match requested base')
  })

  test('getAccessToken returns stored bearer even when local expiry metadata is stale', async () => {
    loadTokensMock.mockResolvedValueOnce({
      accessToken: 'stale',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      tokenVersion: 2,
      issuerBaseUrl: 'http://localhost:4040',
    })

    await expect(getAccessToken()).resolves.toBe('stale')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('deviceCodeLogin stores Better Auth bearer token from set-auth-token header', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        device_code: 'device-code-1',
        user_code: 'ABCD1234',
        verification_uri: 'http://localhost:4040/api/auth/device',
        interval: 1,
      }),
    } as Response)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === 'set-auth-token' ? 'header-token' : null),
      },
      json: async () => ({
        access_token: 'body-token',
        token_type: 'Bearer',
        expires_in: 604799,
        scope: 'cli:read',
      }),
    } as Response)

    await deviceCodeLogin({
      authBaseUrl: 'http://localhost:4040',
      scopes: [],
      outputMode: 'machine',
      timeoutMs: 1000,
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4040/api/auth/device/code',
      expect.objectContaining({
        body: JSON.stringify({
          client_id: 'hominem-cli',
          scope: 'cli:read',
        }),
      }),
    )

    expect(saveTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'header-token',
        issuerBaseUrl: 'http://localhost:4040',
        scopes: ['cli:read'],
        tokenVersion: 2,
      }),
    )
  })

  test('interactiveLogin honors timeoutMs while device authorization remains pending', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        device_code: 'device-code-1',
        user_code: 'ABCD1234',
        verification_uri: 'http://localhost:4040/api/auth/device',
        expires_in: 600,
        interval: 0,
      }),
    } as Response)

    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({
        error: 'authorization_pending',
      }),
    } as Response)

    await expect(
      interactiveLogin({
        authBaseUrl: 'http://localhost:4040',
        outputMode: 'machine',
        timeoutMs: 10,
      }),
    ).rejects.toThrow('timed out')
  })
})
