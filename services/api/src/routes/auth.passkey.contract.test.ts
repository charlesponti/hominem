import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockGetSession = vi.hoisted(() => vi.fn())
const mockHandler = vi.hoisted(() => vi.fn())
const mockCreateTokenPairForUser = vi.hoisted(() => vi.fn())
const mockVerifyAccessToken = vi.hoisted(() => vi.fn())
const mockDbFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: {
    api: {
      getSession: mockGetSession,
    },
    handler: mockHandler,
  },
}))

vi.mock('../auth/session-store', async () => {
  const actual = await vi.importActual<typeof import('../auth/session-store')>('../auth/session-store')
  return {
    ...actual,
    createTokenPairForUser: mockCreateTokenPairForUser,
  }
})

vi.mock('../auth/tokens', async () => {
  const actual = await vi.importActual<typeof import('../auth/tokens')>('../auth/tokens')
  return {
    ...actual,
    verifyAccessToken: mockVerifyAccessToken,
  }
})

vi.mock('@hominem/hono-rpc', async () => {
  const actual = await vi.importActual<typeof import('@hominem/hono-rpc')>('@hominem/hono-rpc')
  return {
    ...actual,
    db: {
      ...actual.db,
      query: {
        ...actual.db.query,
        users: {
          findFirst: mockDbFindFirst,
        },
      },
    },
  }
})

import { createServer } from '../server'

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
}

describe('auth passkey contract', () => {
  beforeEach(() => {
    mockGetSession.mockReset()
    mockHandler.mockReset()
    mockCreateTokenPairForUser.mockReset()
    mockVerifyAccessToken.mockReset()
    mockDbFindFirst.mockReset()
  })

  test('passkey register options rejects unauthorized requests', async () => {
    mockGetSession.mockResolvedValue(null)

    const app = createServer()
    const response = await app.request('http://localhost/api/auth/passkey/register/options', {
      method: 'POST',
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
  })

  test('passkey register verify forwards authenticated success path', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-passkey-1' } })
    mockHandler.mockResolvedValue(
      jsonResponse(
        { success: true },
        {
          status: 200,
          headers: { 'set-cookie': 'better-auth.session=abc; Path=/; HttpOnly' },
        },
      ),
    )

    const app = createServer()
    const response = await app.request('http://localhost/api/auth/passkey/register/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        response: {
          id: 'cred-id',
          rawId: 'raw-id',
          type: 'public-key',
          response: {
            clientDataJSON: 'client-json',
            attestationObject: 'attestation',
            transports: ['internal'],
          },
        },
        name: 'Primary device',
      }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    const forwardedRequest = mockHandler.mock.calls[0]?.[0] as Request
    const forwardedBody = await forwardedRequest.json() as {
      response: { id: string }
      name?: string
    }
    expect(forwardedBody.response.id).toBe('cred-id')
    expect(forwardedBody.name).toBe('Primary device')
  })

  test('passkey auth verify returns canonical token contract on success', async () => {
    mockHandler.mockResolvedValue(
      jsonResponse(
        {
          session: {
            userId: 'user-passkey-2',
          },
        },
        {
          status: 200,
          headers: { 'set-cookie': 'better-auth.session=xyz; Path=/; HttpOnly' },
        },
      ),
    )
    mockDbFindFirst.mockResolvedValue({
      id: 'user-passkey-2',
      email: 'passkey-user@hominem.test',
      name: 'Passkey User',
      isAdmin: false,
    })
    mockCreateTokenPairForUser.mockResolvedValue({
      accessToken: 'access-passkey-token',
      refreshToken: 'refresh-passkey-token',
      expiresIn: 600,
      tokenType: 'Bearer',
    })

    const app = createServer()
    const response = await app.request('http://localhost/api/auth/passkey/auth/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        response: {
          id: 'cred-id',
        },
      }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      user: {
        id: 'user-passkey-2',
        email: 'passkey-user@hominem.test',
        name: 'Passkey User',
      },
      accessToken: 'access-passkey-token',
      refreshToken: 'refresh-passkey-token',
      expiresIn: 600,
      tokenType: 'Bearer',
    })
  })

  test('passkey auth verify forwards malformed assertion failures', async () => {
    mockHandler.mockResolvedValue(
      jsonResponse(
        {
          error: 'invalid_authentication_response',
          message: 'Malformed assertion payload',
        },
        { status: 400 },
      ),
    )

    const app = createServer()
    const response = await app.request('http://localhost/api/auth/passkey/auth/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        response: {
          id: 'broken-cred',
        },
      }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'invalid_authentication_response',
      message: 'Malformed assertion payload',
    })
  })

  test('passkey register and auth resolve authenticated user without provider-specific assumptions', async () => {
    mockVerifyAccessToken.mockResolvedValue({ sub: 'user-passkey-3' })
    mockHandler.mockResolvedValue(jsonResponse({ success: true }, { status: 200 }))

    const app = createServer()
    const response = await app.request('http://localhost/api/auth/passkey/register/options', {
      method: 'POST',
      headers: {
        authorization: 'Bearer bearer-passkey-token',
      },
    })

    expect(response.status).toBe(200)
    expect(mockGetSession).not.toHaveBeenCalled()
  })
})
