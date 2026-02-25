import { jwtVerify, SignJWT } from 'jose'

import { env } from '../env'
import { getSigningKey } from './key-store'

import type { AccessTokenClaims } from './types'

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60

function getAudience() {
  return env.AUTH_AUDIENCE
}

function getIssuer() {
  return env.AUTH_ISSUER
}

export async function issueAccessToken(input: {
  sub: string
  sid: string
  scope?: string[]
  role?: 'user' | 'admin'
  amr?: string[]
}) {
  const nowEpoch = Math.floor(Date.now() / 1000)
  const signingKey = await getSigningKey()

  const payload: AccessTokenClaims = {
    sub: input.sub,
    sid: input.sid,
    scope: input.scope ?? [],
    role: input.role ?? 'user',
    amr: input.amr ?? ['pwd'],
    auth_time: nowEpoch,
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'JWT',
      kid: signingKey.kid,
    })
    .setIssuer(getIssuer())
    .setAudience(getAudience())
    .setIssuedAt(nowEpoch)
    .setExpirationTime(nowEpoch + ACCESS_TOKEN_TTL_SECONDS)
    .setJti(crypto.randomUUID())
    .sign(signingKey.privateKey)

  return {
    accessToken: token,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    tokenType: 'Bearer' as const,
  }
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const signingKey = await getSigningKey()

  const { payload, protectedHeader } = await jwtVerify(token, signingKey.publicKey, {
    issuer: getIssuer(),
    audience: getAudience(),
    algorithms: ['ES256'],
  })

  if (protectedHeader.kid !== signingKey.kid) {
    throw new Error('disallowed_kid')
  }

  const scopeClaim = payload.scope
  const amrClaim = payload.amr

  const normalizedScope = Array.isArray(scopeClaim)
    ? scopeClaim.filter((entry): entry is string => typeof entry === 'string')
    : []
  const normalizedAmr = Array.isArray(amrClaim)
    ? amrClaim.filter((entry): entry is string => typeof entry === 'string')
    : []

  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('invalid_claims')
  }

  return {
    ...payload,
    sub: payload.sub,
    sid: payload.sid,
    scope: normalizedScope,
    role: payload.role === 'admin' ? 'admin' : 'user',
    amr: normalizedAmr,
    auth_time: typeof payload.auth_time === 'number' ? payload.auth_time : 0,
  }
}
