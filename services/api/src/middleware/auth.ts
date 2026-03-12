import type { HominemUser } from '@hominem/auth/server';
import { toHominemUser, UserAuthService } from '@hominem/auth/server';
import { db } from '@hominem/db';
import { logger } from '@hominem/utils/logger';
import type { MiddlewareHandler } from 'hono';

import { betterAuthServer } from '../auth/better-auth';
import { isSessionRevoked } from '../auth/session-store';
import { verifyAccessToken } from '../auth/tokens';
import type { AuthContextEnvelope } from '../auth/types';

type AuthErrorCode =
  | 'invalid_token'
  | 'expired_token'
  | 'invalid_audience'
  | 'invalid_issuer'
  | 'disallowed_kid'
  | 'revoked_session'
  | 'insufficient_scope';

declare module 'hono' {
  interface ContextVariableMap {
    auth?: AuthContextEnvelope;
    user?: HominemUser;
    userId?: string;
    authError?: AuthErrorCode;
  }
}

interface BetterAuthSessionContext {
  auth: AuthContextEnvelope
  user: HominemUser
  userId: string
}

function getBearerToken(headerValue?: string) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  return headerValue.slice(7);
}

const USER_CACHE_TTL_MS = 60_000;
const USER_CACHE_MAX_ENTRIES = 1024;
const userCache = new Map<string, { user: HominemUser; expiresAt: number }>();

function getCachedUser(userId: string) {
  const cached = userCache.get(userId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    userCache.delete(userId);
    return null;
  }

  return cached.user;
}

function setCachedUser(user: HominemUser) {
  if (userCache.size >= USER_CACHE_MAX_ENTRIES) {
    const first = userCache.keys().next().value;
    if (typeof first === 'string') {
      userCache.delete(first);
    }
  }

  userCache.set(user.id, {
    user,
    expiresAt: Date.now() + USER_CACHE_TTL_MS,
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getHominemUserFromJwt(token: string): Promise<HominemUser | null> {
  const claims = await verifyAccessToken(token);
  const cached = getCachedUser(claims.sub);
  if (cached) {
    return cached;
  }

  const dbUser = await UserAuthService.getUserById(claims.sub);
  if (!dbUser) {
    return null;
  }

  const user = toHominemUser(dbUser);
  setCachedUser(user);
  return user;
}

function mapBearerError(error: unknown): AuthErrorCode {
  if (error && typeof error === 'object') {
    const maybeJose = error as { code?: string; claim?: string; message?: string };
    if (maybeJose.code === 'ERR_JWT_EXPIRED') {
      return 'expired_token';
    }
    if (maybeJose.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      if (maybeJose.claim === 'aud') {
        return 'invalid_audience';
      }
      if (maybeJose.claim === 'iss') {
        return 'invalid_issuer';
      }
      return 'invalid_token';
    }
    if (maybeJose.message === 'disallowed_kid') {
      return 'disallowed_kid';
    }
    if (maybeJose.message === 'revoked_session') {
      return 'revoked_session';
    }
  }
  if (error instanceof Error) {
    if (error.message.includes('audience')) {
      return 'invalid_audience';
    }
    if (error.message.includes('issuer')) {
      return 'invalid_issuer';
    }
  }
  return 'invalid_token';
}

function authErrorResponse(code: AuthErrorCode) {
  return {
    error: code,
    message: 'Authentication failed',
  } as const;
}

async function applyBetterAuthSession(c: {
  req: { raw: Request };
  set: <K extends keyof BetterAuthSessionContext>(
    key: K,
    value: BetterAuthSessionContext[K],
  ) => void;
}) {
  const betterAuthSession = await betterAuthServer.api.getSession({
    headers: c.req.raw.headers,
  });

  const betterAuthUserId = betterAuthSession?.user?.id;
  const betterAuthSessionId = betterAuthSession?.session?.id;

  if (!betterAuthUserId || !betterAuthSessionId) {
    return false;
  }

  const cached = getCachedUser(betterAuthUserId);
  if (cached) {
    c.set('user', cached);
    c.set('userId', cached.id);
    c.set('auth', {
      sub: cached.id,
      sid: betterAuthSessionId,
      scope: ['api:read', 'api:write'],
      role: cached.isAdmin ? 'admin' : 'user',
      amr: ['better-auth-session'],
      authTime: Math.floor(Date.now() / 1000),
    });
    return true;
  }

  const dbUser = await UserAuthService.getUserById(betterAuthUserId);
  if (!dbUser) {
    return false;
  }

  const user = toHominemUser(dbUser);
  setCachedUser(user);
  c.set('user', user);
  c.set('userId', dbUser.id);
  c.set('auth', {
    sub: dbUser.id,
    sid: betterAuthSessionId,
    scope: ['api:read', 'api:write'],
    role: user.isAdmin ? 'admin' : 'user',
    amr: ['better-auth-session'],
    authTime: Math.floor(Date.now() / 1000),
  });

  return true;
}

export const authJwtMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const path = c.req.path;
    if (path.startsWith('/api/auth') || path.startsWith('/api/better-auth')) {
      return await next();
    }

    let bearerAuthError: AuthErrorCode | null = null;

    if (process.env.NODE_ENV === 'test') {
      const testUserId = c.req.header('x-user-id');
      if (testUserId) {
        const cached = getCachedUser(testUserId);
        if (cached) {
          c.set('user', cached);
          c.set('userId', cached.id);
          c.set('auth', {
            sub: cached.id,
            sid: crypto.randomUUID(),
            scope: ['api:read', 'api:write'],
            role: cached.isAdmin ? 'admin' : 'user',
            amr: ['test-header'],
            authTime: Math.floor(Date.now() / 1000),
          });
          return await next();
        }

        const testUser = await UserAuthService.findByIdOrEmail({ id: testUserId });
        if (testUser) {
          const user = toHominemUser(testUser);
          setCachedUser(user);
          c.set('user', user);
          c.set('userId', testUser.id);
          c.set('auth', {
            sub: testUser.id,
            sid: crypto.randomUUID(),
            scope: ['api:read', 'api:write'],
            role: user.isAdmin ? 'admin' : 'user',
            amr: ['test-header'],
            authTime: Math.floor(Date.now() / 1000),
          });
          return await next();
        }

        const createdUser = await db
          .insertInto('users')
          .values({
            id: testUserId,
            email: `${testUserId}@hominem.test`,
            is_admin: false,
          })
          .onConflict((oc) => oc.column('id').doNothing())
          .returningAll()
          .executeTakeFirst();

        const fallbackUser =
          createdUser ??
          (await db
            .selectFrom('users')
            .selectAll()
            .where('id', '=', testUserId)
            .executeTakeFirst());

        if (fallbackUser) {
          const user = toHominemUser(fallbackUser);
          setCachedUser(user);
          c.set('user', user);
        }

        c.set('auth', {
          sub: testUserId,
          sid: crypto.randomUUID(),
          scope: ['api:read', 'api:write'],
          role: 'user',
          amr: ['test-header'],
          authTime: Math.floor(Date.now() / 1000),
        });
        c.set('userId', testUserId);
        return await next();
      }
    }

    const bearer = getBearerToken(c.req.header('authorization'));

    if (bearer) {
      try {
        if (await applyBetterAuthSession(c)) {
          return await next();
        }
      } catch (error) {
        logger.warn('[authJwtMiddleware] better auth bearer lookup failed', { error });
      }

      try {
        const claims = await verifyAccessToken(bearer);
        const revoked = await isSessionRevoked(claims.sid);
        if (revoked) {
          throw new Error('revoked_session');
        }
        const cached = getCachedUser(claims.sub);
        if (cached) {
          c.set('user', cached);
          c.set('userId', cached.id);
          c.set('auth', {
            sub: claims.sub,
            sid: claims.sid,
            scope: claims.scope,
            role: claims.role,
            amr: claims.amr,
            authTime: claims.auth_time,
          });
          return await next();
        }

        const dbUser = await UserAuthService.getUserById(claims.sub);
        if (!dbUser) {
          c.set('authError', 'invalid_token');
          return c.json(authErrorResponse('invalid_token'), 401);
        }

        const user = toHominemUser(dbUser);
        setCachedUser(user);
        c.set('user', user);
        c.set('userId', dbUser.id);
        c.set('auth', {
          sub: claims.sub,
          sid: claims.sid,
          scope: claims.scope,
          role: claims.role,
          amr: claims.amr,
          authTime: claims.auth_time,
        });
      } catch (error) {
        const authError = mapBearerError(error);
        bearerAuthError = authError;
        logger.warn('[authJwtMiddleware] invalid bearer token', { authError, error });
      }
    }

    if (bearerAuthError) {
      c.set('authError', bearerAuthError);
      return c.json(authErrorResponse(bearerAuthError), 401);
    }

    try {
      if (await applyBetterAuthSession(c)) {
        return await next();
      }
    } catch (error) {
      logger.warn('[authJwtMiddleware] better auth session lookup failed', { error });
    }

    return await next();
  };
};
