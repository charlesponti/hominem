import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { db, sql } from '@hominem/db';

import { env } from '../env';
import { issueAccessToken } from './tokens';

const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const REVOKED_SESSION_TTL_SECONDS = REFRESH_TTL_SECONDS;
const REVOKED_SESSION_PREFIX = 'auth:revoked:sid:';
const SESSION_STATE_PREFIX = 'auth:session:sid:';

function nowIso() {
  return new Date().toISOString();
}

function toIsoFromNow(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function hashToken(rawToken: string) {
  return createHash('sha256').update(`${rawToken}:${env.BETTER_AUTH_SECRET}`).digest('hex');
}

function createRawToken() {
  return randomBytes(32).toString('base64url');
}

function revokedSessionKey(sessionId: string) {
  return `${REVOKED_SESSION_PREFIX}${sessionId}`;
}

function sessionStateKey(sessionId: string) {
  return `${SESSION_STATE_PREFIX}${sessionId}`;
}

function jsonbStringArray(value: string[]) {
  return sql<string[]>`${JSON.stringify(value)}::jsonb`;
}

async function getRedisClient() {
  const { redis } = await import('@hominem/services/redis');
  return redis;
}

async function cacheSessionState(sessionId: string, state: 'active' | 'revoked') {
  try {
    const redis = await getRedisClient();
    const ttl = state === 'revoked' ? REVOKED_SESSION_TTL_SECONDS : REFRESH_TTL_SECONDS;
    await redis.set(sessionStateKey(sessionId), state, 'EX', ttl);
  } catch {
    // Best-effort cache only.
  }
}

async function ensureAuthSession(input: {
  userId: string;
  sessionState?: string | undefined;
  amr?: string[] | undefined;
  acr?: string | undefined;
  ipHash?: string | undefined;
  userAgentHash?: string | undefined;
}) {
  if (input.sessionState) {
    const existing = await db
      .selectFrom('auth_sessions')
      .selectAll()
      .where((eb) =>
        eb.and([
          eb('user_id', '=', input.userId),
          eb('session_state', '=', input.sessionState!),
          eb('revoked_at', 'is', null),
        ]),
      )
      .limit(1)
      .executeTakeFirst();

    if (existing) {
      await cacheSessionState(existing.id, 'active');
      const updated = await db
        .updateTable('auth_sessions')
        .set({
          last_seen_at: nowIso(),
          ...(input.amr ? { amr: jsonbStringArray(input.amr) } : {}),
        })
        .where((eb) => eb('id', '=', existing.id))
        .returningAll()
        .executeTakeFirst();
      return updated ?? existing;
    }
  }

  const created = await db
    .insertInto('auth_sessions')
    .values({
      id: randomUUID(),
      user_id: input.userId,
      session_state: input.sessionState ?? randomUUID(),
      created_at: nowIso(),
      last_seen_at: nowIso(),
      ...(input.amr ? { amr: jsonbStringArray(input.amr) } : {}),
      ...(input.acr ? { acr: input.acr } : {}),
      ...(input.ipHash ? { ip_hash: input.ipHash } : {}),
      ...(input.userAgentHash ? { user_agent_hash: input.userAgentHash } : {}),
    })
    .returningAll()
    .executeTakeFirst();

  if (!created) {
    throw new Error('Failed to create auth session');
  }

  await cacheSessionState(created.id, 'active');

  return created;
}

async function issueRefreshToken(input: {
  sessionId: string;
  familyId?: string | undefined;
  parentId?: string | undefined;
  expiresAt?: string | undefined;
}) {
  const raw = createRawToken();
  const tokenHash = hashToken(raw);
  const created = await db
    .insertInto('auth_refresh_tokens')
    .values({
      id: randomUUID(),
      session_id: input.sessionId,
      family_id: input.familyId ?? randomUUID(),
      token_hash: tokenHash,
      ...(input.parentId ? { parent_id: input.parentId } : {}),
      expires_at: input.expiresAt ?? toIsoFromNow(REFRESH_TTL_SECONDS),
    })
    .returningAll()
    .executeTakeFirst();

  if (!created) {
    throw new Error('Failed to issue refresh token');
  }

  return { rawToken: raw, record: created };
}

async function revokeRefreshFamily(familyId: string) {
  await db
    .updateTable('auth_refresh_tokens')
    .set({ revoked_at: nowIso() })
    .where((eb) => eb.and([eb('family_id', '=', familyId), eb('revoked_at', 'is', null)]))
    .execute();
}

export async function revokeSession(sessionId: string) {
  try {
    const redis = await getRedisClient();
    await redis.set(revokedSessionKey(sessionId), '1', 'EX', REVOKED_SESSION_TTL_SECONDS);
    await redis.set(sessionStateKey(sessionId), 'revoked', 'EX', REVOKED_SESSION_TTL_SECONDS);
  } catch {
    // Fall back to DB-only revocation semantics when Redis is unavailable.
  }

  await db
    .updateTable('auth_sessions')
    .set({ revoked_at: nowIso(), last_seen_at: nowIso() })
    .where((eb) => eb('id', '=', sessionId))
    .execute();

  await db
    .updateTable('auth_refresh_tokens')
    .set({ revoked_at: nowIso() })
    .where((eb) => eb.and([eb('session_id', '=', sessionId), eb('revoked_at', 'is', null)]))
    .execute();
}

export async function isSessionRevoked(sessionId: string) {
  try {
    const redis = await getRedisClient();
    const state = await redis.get(sessionStateKey(sessionId));
    if (state === 'revoked') {
      return true;
    }
    if (state === 'active') {
      return false;
    }

    const cached = await redis.get(revokedSessionKey(sessionId));
    if (cached === '1') {
      await cacheSessionState(sessionId, 'revoked');
      return true;
    }
  } catch {
    // Ignore Redis lookup failures and fall back to DB.
  }

  const session = await db
    .selectFrom('auth_sessions')
    .select(['revoked_at'])
    .where((eb) => eb('id', '=', sessionId))
    .limit(1)
    .executeTakeFirst();

  const revoked = Boolean(session?.revoked_at);
  if (revoked) {
    await cacheSessionState(sessionId, 'revoked');
    try {
      const redis = await getRedisClient();
      await redis.set(revokedSessionKey(sessionId), '1', 'EX', REVOKED_SESSION_TTL_SECONDS);
    } catch {
      // Best-effort cache hydration only.
    }
  } else if (session) {
    await cacheSessionState(sessionId, 'active');
  }

  return revoked;
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const now = nowIso();
  const existing = await db
    .selectFrom('auth_refresh_tokens')
    .selectAll()
    .where((eb) => eb('token_hash', '=', tokenHash))
    .limit(1)
    .executeTakeFirst();

  if (!existing) {
    return { ok: false as const, error: 'invalid_refresh_token' as const };
  }

  if (existing.revoked_at) {
    return { ok: false as const, error: 'revoked_refresh_token' as const };
  }

  if (existing.used_at) {
    await revokeRefreshFamily(existing.family_id);
    await revokeSession(existing.session_id);
    return { ok: false as const, error: 'refresh_replay_detected' as const };
  }

  if (new Date(existing.expires_at).getTime() <= Date.now()) {
    return { ok: false as const, error: 'expired_refresh_token' as const };
  }

  const markedUsed = await db
    .updateTable('auth_refresh_tokens')
    .set({ used_at: now })
    .where((eb) => eb.and([eb('id', '=', existing.id), eb('used_at', 'is', null)]))
    .returningAll()
    .executeTakeFirst();

  if (!markedUsed) {
    await revokeRefreshFamily(existing.family_id);
    await revokeSession(existing.session_id);
    return { ok: false as const, error: 'refresh_replay_detected' as const };
  }

  const issued = await issueRefreshToken({
    sessionId: existing.session_id,
    familyId: existing.family_id,
    parentId: existing.id,
  });

  const session = await db
    .selectFrom('auth_sessions')
    .selectAll()
    .where((eb) => eb('id', '=', existing.session_id))
    .limit(1)
    .executeTakeFirst();

  if (!session || session.revoked_at) {
    return { ok: false as const, error: 'invalid_session' as const };
  }

  const user = await db
    .selectFrom('users')
    .select(['id', 'is_admin'])
    .where((eb) => eb('id', '=', session.user_id))
    .limit(1)
    .executeTakeFirst();

  if (!user) {
    return { ok: false as const, error: 'user_not_found' as const };
  }

  await db
    .updateTable('auth_sessions')
    .set({ last_seen_at: nowIso() })
    .where((eb) => eb('id', '=', session.id))
    .execute();

  await cacheSessionState(session.id, 'active');

  const access = await issueAccessToken({
    sub: user.id,
    sid: session.id,
    role: user.is_admin ? 'admin' : 'user',
    scope: ['api:read', 'api:write'],
    amr: (session.amr as string[]) ?? ['oauth'],
  });

  return {
    ok: true as const,
    accessToken: access.accessToken,
    tokenType: access.tokenType,
    expiresIn: access.expiresIn,
    refreshToken: issued.rawToken,
    sessionId: session.id,
    refreshFamilyId: issued.record.family_id,
  };
}

export async function createTokenPairForUser(input: {
  userId: string;
  sessionState?: string | undefined;
  role?: 'user' | 'admin' | undefined;
  scope?: string[] | undefined;
  amr?: string[] | undefined;
}) {
  const session = await ensureAuthSession({
    userId: input.userId,
    sessionState: input.sessionState,
    amr: input.amr ?? ['oauth'],
  });

  const access = await issueAccessToken({
    sub: input.userId,
    sid: session.id,
    role: input.role ?? 'user',
    scope: input.scope ?? ['api:read', 'api:write'],
    amr: input.amr ?? ['oauth'],
  });

  const refresh = await issueRefreshToken({ sessionId: session.id });

  return {
    accessToken: access.accessToken,
    tokenType: access.tokenType,
    expiresIn: access.expiresIn,
    refreshToken: refresh.rawToken,
    sessionId: session.id,
    refreshFamilyId: refresh.record.family_id,
  };
}

export async function createE2eTokenPairForUser(input: {
  userId: string;
  role?: 'user' | 'admin' | undefined;
  scope?: string[] | undefined;
  amr?: string[] | undefined;
}) {
  return createTokenPairForUser({
    userId: input.userId,
    role: input.role ?? 'user',
    scope: input.scope ?? ['api:read', 'api:write'],
    amr: input.amr ?? ['e2e', 'mobile'],
  });
}

export async function revokeByRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const existing = await db
    .selectFrom('auth_refresh_tokens')
    .selectAll()
    .where((eb) => eb('token_hash', '=', tokenHash))
    .limit(1)
    .executeTakeFirst();

  if (!existing) {
    return false;
  }

  await revokeRefreshFamily(existing.family_id);
  await revokeSession(existing.session_id);
  return true;
}
