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

function createDeviceCodeResponse(overrides?: Partial<{
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      device_code: 'device-code-1',
      user_code: 'ABCD1234',
      verification_uri: 'http://localhost:4040/api/auth/device',
      expires_in: 600,
      interval: 1,
      ...overrides,
    }),
  } as Response
}

function createDeviceTokenResponse(input?: {
  headerToken?: string | null
  bodyToken?: string
  scope?: string
  expiresIn?: number
}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => {
        if (name !== 'set-auth-token') {
          return null
        }
        if (input && 'headerToken' in input) {
          return input.headerToken ?? null
        }
        return 'header-token'
      },
    },
    json: async () => ({
      access_token: input?.bodyToken ?? 'body-token',
      token_type: 'Bearer',
      expires_in: input?.expiresIn ?? 604799,
      scope: input?.scope ?? 'cli:read',
    }),
  } as Response
}

function createPendingTokenResponse() {
  return {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({
      error: 'authorization_pending',
    }),
  } as Response
}

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
    fetchMock.mockResolvedValueOnce(createDeviceCodeResponse())
    fetchMock.mockResolvedValueOnce(createDeviceTokenResponse())

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

  test('deviceCodeLogin falls back to access_token from the response body when header is absent', async () => {
    fetchMock.mockResolvedValueOnce(createDeviceCodeResponse())
    fetchMock.mockResolvedValueOnce(
      createDeviceTokenResponse({
        headerToken: null,
        bodyToken: 'body-only-token',
      }),
    )

    await deviceCodeLogin({
      authBaseUrl: 'http://localhost:4040',
      scopes: [],
      outputMode: 'machine',
      timeoutMs: 1000,
    })

    expect(saveTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'body-only-token',
        scopes: ['cli:read'],
      }),
    )
  })

  test('interactiveLogin fails loudly when the browser verification URL cannot be opened', async () => {
    openMock.mockRejectedValueOnce(new Error('open failed'))
    fetchMock.mockResolvedValueOnce(createDeviceCodeResponse())

    await expect(
      interactiveLogin({
        authBaseUrl: 'http://localhost:4040',
        outputMode: 'interactive',
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_LOGIN_FAILED',
      hint: 'Open http://localhost:4040/api/auth/device manually',
    })

    expect(saveTokensMock).not.toHaveBeenCalled()
  })

  test('interactiveLogin honors timeoutMs while device authorization remains pending', async () => {
    fetchMock.mockResolvedValueOnce(createDeviceCodeResponse({ interval: 0 }))
    fetchMock.mockResolvedValue(createPendingTokenResponse())

    await expect(
      interactiveLogin({
        authBaseUrl: 'http://localhost:4040',
        outputMode: 'machine',
        timeoutMs: 10,
      }),
    ).rejects.toThrow('timed out')
  })
})
