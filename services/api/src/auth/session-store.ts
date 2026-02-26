import { and, eq, isNull } from '@hominem/db'
import { db } from '@hominem/db'
import { authRefreshTokens, authSessions } from '@hominem/db/schema/auth'
import { users } from '@hominem/db/schema/users'

import { env } from '../env'
import { issueAccessToken } from './tokens'
import { createHash, randomBytes, randomUUID } from 'node:crypto'

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30
const REVOKED_SESSION_TTL_SECONDS = REFRESH_TTL_SECONDS
const REVOKED_SESSION_PREFIX = 'auth:revoked:sid:'
const SESSION_STATE_PREFIX = 'auth:session:sid:'

function nowIso() {
  return new Date().toISOString()
}

function toIsoFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(`${rawToken}:${env.BETTER_AUTH_SECRET}`).digest('hex')
}

function createRawToken() {
  return randomBytes(32).toString('base64url')
}

function revokedSessionKey(sessionId: string) {
  return `${REVOKED_SESSION_PREFIX}${sessionId}`
}

function sessionStateKey(sessionId: string) {
  return `${SESSION_STATE_PREFIX}${sessionId}`
}

async function getRedisClient() {
  const { redis } = await import('@hominem/services/redis')
  return redis
}

async function cacheSessionState(sessionId: string, state: 'active' | 'revoked') {
  try {
    const redis = await getRedisClient()
    const ttl = state === 'revoked' ? REVOKED_SESSION_TTL_SECONDS : REFRESH_TTL_SECONDS
    await redis.set(sessionStateKey(sessionId), state, 'EX', ttl)
  } catch {
    // Best-effort cache only.
  }
}

export async function ensureAuthSession(input: {
  userId: string
  sessionState?: string | undefined
  amr?: string[] | undefined
  acr?: string | undefined
  ipHash?: string | undefined
  userAgentHash?: string | undefined
}) {
  if (input.sessionState) {
    const [existing] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, input.userId),
          eq(authSessions.sessionState, input.sessionState),
          isNull(authSessions.revokedAt)
        )
      )
      .limit(1)

    if (existing) {
      await cacheSessionState(existing.id, 'active')
      const [updated] = await db
        .update(authSessions)
        .set({ lastSeenAt: nowIso(), ...(input.amr ? { amr: input.amr } : {}) })
        .where(eq(authSessions.id, existing.id))
        .returning()
      return updated ?? existing
    }
  }

  const [created] = await db
    .insert(authSessions)
    .values({
      id: randomUUID(),
      userId: input.userId,
      sessionState: input.sessionState ?? randomUUID(),
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      ...(input.amr ? { amr: input.amr } : {}),
      ...(input.acr ? { acr: input.acr } : {}),
      ...(input.ipHash ? { ipHash: input.ipHash } : {}),
      ...(input.userAgentHash ? { userAgentHash: input.userAgentHash } : {}),
    })
    .returning()

  if (!created) {
    throw new Error('Failed to create auth session')
  }

  await cacheSessionState(created.id, 'active')

  return created
}

export async function issueRefreshToken(input: {
  sessionId: string
  familyId?: string | undefined
  parentId?: string | undefined
  expiresAt?: string | undefined
}) {
  const raw = createRawToken()
  const tokenHash = hashToken(raw)
  const [created] = await db
    .insert(authRefreshTokens)
    .values({
      id: randomUUID(),
      sessionId: input.sessionId,
      familyId: input.familyId ?? randomUUID(),
      tokenHash,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      expiresAt: input.expiresAt ?? toIsoFromNow(REFRESH_TTL_SECONDS),
    })
    .returning()

  if (!created) {
    throw new Error('Failed to issue refresh token')
  }

  return { rawToken: raw, record: created }
}

export async function revokeRefreshFamily(familyId: string) {
  await db
    .update(authRefreshTokens)
    .set({ revokedAt: nowIso() })
    .where(and(eq(authRefreshTokens.familyId, familyId), isNull(authRefreshTokens.revokedAt)))
}

export async function revokeSession(sessionId: string) {
  try {
    const redis = await getRedisClient()
    await redis.set(revokedSessionKey(sessionId), '1', 'EX', REVOKED_SESSION_TTL_SECONDS)
    await redis.set(sessionStateKey(sessionId), 'revoked', 'EX', REVOKED_SESSION_TTL_SECONDS)
  } catch {
    // Fall back to DB-only revocation semantics when Redis is unavailable.
  }

  await db
    .update(authSessions)
    .set({ revokedAt: nowIso(), lastSeenAt: nowIso() })
    .where(eq(authSessions.id, sessionId))

  await db
    .update(authRefreshTokens)
    .set({ revokedAt: nowIso() })
    .where(and(eq(authRefreshTokens.sessionId, sessionId), isNull(authRefreshTokens.revokedAt)))
}

export async function isSessionRevoked(sessionId: string) {
  try {
    const redis = await getRedisClient()
    const state = await redis.get(sessionStateKey(sessionId))
    if (state === 'revoked') {
      return true
    }
    if (state === 'active') {
      return false
    }

    const cached = await redis.get(revokedSessionKey(sessionId))
    if (cached === '1') {
      await cacheSessionState(sessionId, 'revoked')
      return true
    }
  } catch {
    // Ignore Redis lookup failures and fall back to DB.
  }

  const [session] = await db
    .select({ revokedAt: authSessions.revokedAt })
    .from(authSessions)
    .where(eq(authSessions.id, sessionId))
    .limit(1)

  const revoked = Boolean(session?.revokedAt)
  if (revoked) {
    await cacheSessionState(sessionId, 'revoked')
    try {
      const redis = await getRedisClient()
      await redis.set(revokedSessionKey(sessionId), '1', 'EX', REVOKED_SESSION_TTL_SECONDS)
    } catch {
      // Best-effort cache hydration only.
    }
  } else if (session) {
    await cacheSessionState(sessionId, 'active')
  }

  return revoked
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken)
  const now = nowIso()
  const [existing] = await db
    .select()
    .from(authRefreshTokens)
    .where(eq(authRefreshTokens.tokenHash, tokenHash))
    .limit(1)

  if (!existing) {
    return { ok: false as const, error: 'invalid_refresh_token' as const }
  }

  if (existing.revokedAt) {
    return { ok: false as const, error: 'revoked_refresh_token' as const }
  }

  if (existing.usedAt) {
    await revokeRefreshFamily(existing.familyId)
    await revokeSession(existing.sessionId)
    return { ok: false as const, error: 'refresh_replay_detected' as const }
  }

  if (new Date(existing.expiresAt).getTime() <= Date.now()) {
    return { ok: false as const, error: 'expired_refresh_token' as const }
  }

  const [markedUsed] = await db
    .update(authRefreshTokens)
    .set({ usedAt: now })
    .where(and(eq(authRefreshTokens.id, existing.id), isNull(authRefreshTokens.usedAt)))
    .returning()

  if (!markedUsed) {
    await revokeRefreshFamily(existing.familyId)
    await revokeSession(existing.sessionId)
    return { ok: false as const, error: 'refresh_replay_detected' as const }
  }

  const issued = await issueRefreshToken({
    sessionId: existing.sessionId,
    familyId: existing.familyId,
    parentId: existing.id,
  })

  const [session] = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.id, existing.sessionId))
    .limit(1)
  if (!session || session.revokedAt) {
    return { ok: false as const, error: 'invalid_session' as const }
  }

  const [user] = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
  if (!user) {
    return { ok: false as const, error: 'user_not_found' as const }
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: nowIso() })
    .where(eq(authSessions.id, session.id))
  await cacheSessionState(session.id, 'active')

  const access = await issueAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.isAdmin ? 'admin' : 'user',
    scope: ['api:read', 'api:write'],
    amr: session.amr ?? ['oauth'],
  })

  return {
    ok: true as const,
    accessToken: access.accessToken,
    tokenType: access.tokenType,
    expiresIn: access.expiresIn,
    refreshToken: issued.rawToken,
    sessionId: session.id,
    refreshFamilyId: issued.record.familyId,
  }
}

export async function createTokenPairForUser(input: {
  userId: string
  sessionState?: string | undefined
  role?: 'user' | 'admin' | undefined
  scope?: string[] | undefined
  amr?: string[] | undefined
}) {
  const session = await ensureAuthSession({
    userId: input.userId,
    sessionState: input.sessionState,
    amr: input.amr ?? ['oauth'],
  })

  const access = await issueAccessToken({
    sub: input.userId,
    sid: session.id,
    role: input.role ?? 'user',
    scope: input.scope ?? ['api:read', 'api:write'],
    amr: input.amr ?? ['oauth'],
  })

  const refresh = await issueRefreshToken({ sessionId: session.id })

  return {
    accessToken: access.accessToken,
    tokenType: access.tokenType,
    expiresIn: access.expiresIn,
    refreshToken: refresh.rawToken,
    sessionId: session.id,
    refreshFamilyId: refresh.record.familyId,
  }
}

export async function createE2eTokenPairForUser(input: {
  userId: string
  role?: 'user' | 'admin' | undefined
  scope?: string[] | undefined
  amr?: string[] | undefined
}) {
  return createTokenPairForUser({
    userId: input.userId,
    role: input.role ?? 'user',
    scope: input.scope ?? ['api:read', 'api:write'],
    amr: input.amr ?? ['e2e', 'mobile'],
  })
}

export async function revokeByRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken)
  const [existing] = await db
    .select()
    .from(authRefreshTokens)
    .where(eq(authRefreshTokens.tokenHash, tokenHash))
    .limit(1)

  if (!existing) {
    return false
  }

  await revokeRefreshFamily(existing.familyId)
  await revokeSession(existing.sessionId)
  return true
}
