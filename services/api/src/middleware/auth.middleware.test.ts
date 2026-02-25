import { db, eq } from '@hominem/db'
import { users } from '@hominem/db/schema/users'
import { SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { env } from '../env'
import { getSigningKey } from '../auth/key-store'
import { revokeSession } from '../auth/session-store'
import { createServer } from '../server'

async function issueCustomToken(input: {
  sub?: string
  sid?: string
  audience?: string
  expiresInSeconds?: number
}) {
  const signingKey = await getSigningKey()
  const nowEpoch = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sub: input.sub ?? 'middleware-test-user',
    sid: input.sid ?? crypto.randomUUID(),
    scope: ['api:read'],
    role: 'user',
    amr: ['oauth'],
    auth_time: nowEpoch,
  })
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'JWT',
      kid: signingKey.kid,
    })
    .setIssuer(env.AUTH_ISSUER)
    .setAudience(input.audience ?? env.AUTH_AUDIENCE)
    .setIssuedAt(nowEpoch)
    .setExpirationTime(nowEpoch + (input.expiresInSeconds ?? 600))
    .setJti(crypto.randomUUID())
    .sign(signingKey.privateKey)
}

describe('authJwtMiddleware', () => {
  const testUserId = crypto.randomUUID()

  beforeAll(async () => {
    const now = new Date().toISOString()
    await db.insert(users).values({
      id: testUserId,
      email: `middleware-auth-${testUserId}@example.com`,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    })
  })

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, testUserId))
  })

  test('rejects malformed bearer tokens', async () => {
    const app = createServer()
    const response = await app.request('/api/status', {
      headers: {
        authorization: 'Bearer not-a-jwt',
      },
    })

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(body.error).toBe('invalid_token')
  })

  test('rejects expired bearer tokens', async () => {
    const app = createServer()
    const token = await issueCustomToken({
      expiresInSeconds: -60,
    })

    const response = await app.request('/api/status', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(body.error).toBe('expired_token')
  })

  test('rejects wrong-audience bearer tokens', async () => {
    const app = createServer()
    const token = await issueCustomToken({
      audience: 'invalid-audience',
    })

    const response = await app.request('/api/status', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(body.error).toBe('invalid_audience')
  })

  test('rejects revoked sessions', async () => {
    const app = createServer()
    const sid = crypto.randomUUID()
    await revokeSession(sid)
    const token = await issueCustomToken({ sid })

    const response = await app.request('/api/status', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(body.error).toBe('revoked_session')
  })

  test('keeps context contract stable for authenticated RPC routes', async () => {
    const app = createServer()
    const response = await app.request('/api/lists/list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': testUserId,
      },
      body: JSON.stringify({}),
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as unknown
    expect(Array.isArray(body)).toBe(true)
  })

  test('rejects invalid bearer token on RPC routes with typed auth error', async () => {
    const app = createServer()
    const response = await app.request('/api/lists/list', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer not-a-jwt',
      },
      body: JSON.stringify({}),
    })

    const body = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(body.error).toBe('invalid_token')
  })
})
