import { createHash, randomBytes } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'

const mockRedisStore = vi.hoisted(() => new Map<string, string>())

const mockBetterAuthApi = vi.hoisted(() => ({
  signInSocial: vi.fn(async () => ({
    url: 'https://appleid.apple.com/auth/authorize?client_id=hominem',
  })),
  getSession: vi.fn(async () => ({
    user: {
      id: 'apple-subject-1',
      email: 'cli-auth-test@example.com',
      name: 'CLI Auth Test',
      image: null,
    },
    session: {
      id: 'better-auth-session-1',
    },
  })),
}))

const mockBetterAuthHandler = vi.hoisted(() =>
  vi.fn(async (request: Request) => {
    const url = new URL(request.url)
    if (url.pathname === '/api/auth/sign-in/social') {
      return new Response(
        JSON.stringify({
          url: 'https://appleid.apple.com/auth/authorize?client_id=hominem',
          redirect: true,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            location: 'https://appleid.apple.com/auth/authorize?client_id=hominem',
            'set-cookie':
              '__Secure-better-auth.state=state-cookie-value; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax',
          },
        },
      )
    }

    if (url.pathname === '/api/auth/link-social') {
      return new Response(
        JSON.stringify({
          url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=hominem',
          redirect: true,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            location: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=hominem',
          },
        },
      )
    }

    if (url.pathname === '/api/auth/callback/apple' || url.pathname === '/api/auth/callback/google') {
      return new Response(null, {
        status: 302,
        headers: {
          location: 'http://127.0.0.1:53111/callback?state=callback-proxy-test',
        },
      })
    }
    return new Response(null, { status: 404 })
  })
)

const mockEnsureOAuthSubjectUser = vi.hoisted(() =>
  vi.fn(async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'cli-auth-test@example.com',
    name: 'CLI Auth Test',
    image: null,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
)

const mockCreateTokenPairForUser = vi.hoisted(() =>
  vi.fn(async () => ({
    accessToken: 'access-token-cli-1',
    refreshToken: 'refresh-token-cli-1',
    tokenType: 'Bearer',
    expiresIn: 600,
    sessionId: '22222222-2222-4222-8222-222222222222',
    refreshFamilyId: '33333333-3333-4333-8333-333333333333',
  }))
)

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: {
    api: mockBetterAuthApi,
    handler: mockBetterAuthHandler,
  },
}))

vi.mock('../middleware/auth', () => ({
  authJwtMiddleware: () =>
    async (c: { set: (key: string, value: unknown) => void }, next: () => Promise<void>) => {
      c.set('userId', '11111111-1111-4111-8111-111111111111')
      await next()
    },
}))

vi.mock('@hominem/services/redis', () => ({
  redis: {
    on: vi.fn(),
    set: vi.fn(async (key: string, value: string) => {
      mockRedisStore.set(key, value)
      return 'OK'
    }),
    get: vi.fn(async (key: string) => {
      return mockRedisStore.get(key) ?? null
    }),
    del: vi.fn(async (key: string) => {
      const existed = mockRedisStore.has(key)
      mockRedisStore.delete(key)
      return existed ? 1 : 0
    }),
  },
}))

vi.mock('../auth/subjects', async () => {
  const actual = await vi.importActual<typeof import('../auth/subjects')>('../auth/subjects')
  return {
    ...actual,
    ensureOAuthSubjectUser: mockEnsureOAuthSubjectUser,
  }
})

vi.mock('../auth/session-store', async () => {
  const actual = await vi.importActual<typeof import('../auth/session-store')>('../auth/session-store')
  return {
    ...actual,
    createTokenPairForUser: mockCreateTokenPairForUser,
  }
})

import { createServer } from '../server'

function createPkcePair() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

describe('CLI auth bridge routes', () => {
  test('proxies POST /api/auth/callback/apple to Better Auth callback handler path', async () => {
    mockBetterAuthHandler.mockClear()
    const app = createServer()

    const response = await app.request('http://localhost/api/auth/callback/apple', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'state=test-callback-proxy',
    })

    expect(response.status).toBe(302)
    expect(mockBetterAuthHandler).toHaveBeenCalled()

    const [forwardedRequest] = mockBetterAuthHandler.mock.calls.at(-1) ?? []
    expect(forwardedRequest).toBeTruthy()
    const forwardedUrl = new URL((forwardedRequest as Request).url)
    expect(forwardedUrl.pathname).toBe('/api/auth/callback/apple')
    expect((forwardedRequest as Request).method).toBe('POST')
  })

  test('preserves callback query params when proxying GET /api/auth/callback/apple', async () => {
    mockBetterAuthHandler.mockClear()
    const app = createServer()

    const response = await app.request(
      'http://localhost/api/auth/callback/apple?code=test-code-1&state=test-state-1&error_description=test',
      {
        method: 'GET',
      },
    )

    expect(response.status).toBe(302)
    expect(mockBetterAuthHandler).toHaveBeenCalled()

    const [forwardedRequest] = mockBetterAuthHandler.mock.calls.at(-1) ?? []
    expect(forwardedRequest).toBeTruthy()
    const forwardedUrl = new URL((forwardedRequest as Request).url)
    expect(forwardedUrl.searchParams.get('code')).toBe('test-code-1')
    expect(forwardedUrl.searchParams.get('state')).toBe('test-state-1')
    expect(forwardedUrl.searchParams.get('error_description')).toBe('test')
  })

  test('normalizes /api/auth/authorize to explicit redirect with state cookie', async () => {
    const app = createServer()

    const response = await app.request(
      `http://localhost/api/auth/authorize?provider=apple&redirect_uri=${encodeURIComponent(
        'https://auth.ponti.io/api/auth/mobile/callback?flow_id=test-flow',
      )}`,
      {
        method: 'GET',
      },
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('appleid.apple.com')
    expect(response.headers.get('set-cookie')).toContain('__Secure-better-auth.state=')
  })

  test('rejects non-loopback redirect URIs on /api/auth/cli/authorize', async () => {
    const app = createServer()

    const response = await app.request('http://localhost/api/auth/cli/authorize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        redirect_uri: 'https://malicious.example.com/callback',
        code_challenge: createPkcePair().challenge,
        state: 'state-allowlist-test',
      }),
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('invalid_redirect_uri')
  })

  test('completes authorize -> callback -> exchange loopback PKCE flow', async () => {
    mockRedisStore.clear()
    const app = createServer()
    const redirectUri = 'http://127.0.0.1:53111/callback'
    const state = 'cli-state-happy-path'
    const pkce = createPkcePair()

    const authorizeResponse = await app.request('http://localhost/api/auth/cli/authorize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        redirect_uri: redirectUri,
        code_challenge: pkce.challenge,
        state,
        scope: 'cli:read cli:write',
      }),
    })

    expect(authorizeResponse.status).toBe(200)
    const authorizeBody = (await authorizeResponse.json()) as {
      authorization_url: string
      flow_id: string
    }

    const authorizeStart = new URL(authorizeBody.authorization_url)
    expect(authorizeStart.pathname).toBe('/api/auth/authorize')
    expect(authorizeStart.searchParams.get('provider')).toBe('apple')
    expect(authorizeStart.searchParams.get('redirect_uri')).toContain('/api/auth/cli/callback?flow_id=')
    expect(authorizeBody.flow_id.length).toBeGreaterThan(10)

    const callbackResponse = await app.request(
      `http://localhost/api/auth/cli/callback?flow_id=${encodeURIComponent(authorizeBody.flow_id)}`,
      {
        method: 'GET',
      }
    )

    expect(callbackResponse.status).toBe(302)
    const location = callbackResponse.headers.get('location')
    expect(location).toBeTruthy()

    const callbackRedirect = new URL(location as string)
    expect(callbackRedirect.origin).toBe('http://127.0.0.1:53111')
    expect(callbackRedirect.searchParams.get('state')).toBe(state)

    const exchangeCode = callbackRedirect.searchParams.get('code')
    expect(exchangeCode).toBeTruthy()

    const exchangeResponse = await app.request('http://localhost/api/auth/cli/exchange', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        code: exchangeCode,
        code_verifier: pkce.verifier,
        redirect_uri: redirectUri,
      }),
    })

    expect(exchangeResponse.status).toBe(200)
    const exchangeBody = (await exchangeResponse.json()) as {
      access_token: string
      refresh_token: string
      token_type: string
      expires_in: number
      session_id: string
      refresh_family_id: string
      scope: string
      provider: string
    }

    expect(exchangeBody.access_token).toBe('access-token-cli-1')
    expect(exchangeBody.refresh_token).toBe('refresh-token-cli-1')
    expect(exchangeBody.token_type).toBe('Bearer')
    expect(exchangeBody.expires_in).toBe(600)
    expect(exchangeBody.session_id).toBe('22222222-2222-4222-8222-222222222222')
    expect(exchangeBody.refresh_family_id).toBe('33333333-3333-4333-8333-333333333333')
    expect(exchangeBody.scope).toBe('cli:read cli:write')
    expect(exchangeBody.provider).toBe('better-auth')

    expect(mockEnsureOAuthSubjectUser).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        providerSubject: 'apple-subject-1',
      })
    )
    expect(mockCreateTokenPairForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '11111111-1111-4111-8111-111111111111',
      })
    )
  })

  test('rejects PKCE mismatches on /api/auth/cli/exchange', async () => {
    mockRedisStore.clear()
    const app = createServer()
    const redirectUri = 'http://127.0.0.1:53112/callback'
    const state = 'cli-state-pkce-mismatch'
    const pkce = createPkcePair()

    const authorizeResponse = await app.request('http://localhost/api/auth/cli/authorize', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        redirect_uri: redirectUri,
        code_challenge: pkce.challenge,
        state,
        scope: 'cli:read',
      }),
    })

    const authorizeBody = (await authorizeResponse.json()) as { flow_id: string }

    const callbackResponse = await app.request(
      `http://localhost/api/auth/cli/callback?flow_id=${encodeURIComponent(authorizeBody.flow_id)}`,
      {
        method: 'GET',
      }
    )

    const location = callbackResponse.headers.get('location') as string
    const exchangeCode = new URL(location).searchParams.get('code') as string

    const mismatchVerifier = randomBytes(32).toString('base64url')
    const exchangeResponse = await app.request('http://localhost/api/auth/cli/exchange', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        code: exchangeCode,
        code_verifier: mismatchVerifier,
        redirect_uri: redirectUri,
      }),
    })

    expect(exchangeResponse.status).toBe(400)
    const body = (await exchangeResponse.json()) as { error: string; message?: string }
    expect(body.error).toBe('invalid_grant')
    expect(body.message).toContain('PKCE verifier mismatch')
  })

  test('allows trusted web redirect URIs on /api/auth/link/google/start', async () => {
    const app = createServer()

    const response = await app.request(
      `http://localhost/api/auth/link/google/start?redirect_uri=${encodeURIComponent('http://localhost:4444/account')}`,
      {
        method: 'POST',
      },
    )

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('accounts.google.com')
  })

  test('rejects untrusted web redirect URIs on /api/auth/link/google/start', async () => {
    const app = createServer()

    const response = await app.request(
      `http://localhost/api/auth/link/google/start?redirect_uri=${encodeURIComponent('https://evil.example.com/account')}`,
      {
        method: 'POST',
      },
    )

    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('invalid_redirect_uri')
  })
})
