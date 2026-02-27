import type { HominemUser } from '@hominem/auth/server';
import type { MiddlewareHandler } from 'hono';

import { toHominemUser, UserAuthService } from '@hominem/auth/server';
import { logger } from '@hominem/utils/logger';

import type { AuthContextEnvelope } from '../auth/types';

import { betterAuthServer } from '../auth/better-auth';
import { isSessionRevoked } from '../auth/session-store';
import { ensureOAuthSubjectUser } from '../auth/subjects';
import { verifyAccessToken } from '../auth/tokens';

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

export async function getHominemUserFromJwt(token: string): Promise<HominemUser | null> {
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

export const authJwtMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
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
            role: testUser.isAdmin ? 'admin' : 'user',
            amr: ['test-header'],
            authTime: Math.floor(Date.now() / 1000),
          });
          return await next();
        }
      }
    }

    const bearer = getBearerToken(c.req.header('authorization'));

    if (bearer) {
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
        c.set('authError', authError);
        logger.warn('[authJwtMiddleware] invalid bearer token', { authError, error });
        return c.json(authErrorResponse(authError), 401);
      }
    }

    if (!c.get('user')) {
      try {
        const session = await betterAuthServer.api.getSession({
          headers: c.req.raw.headers,
        });

        if (session?.user?.id && session.user.email) {
          const dbUser = await ensureOAuthSubjectUser({
            provider: 'apple',
            providerSubject: session.user.id,
            email: session.user.email,
            ...(session.user.name !== undefined ? { name: session.user.name } : {}),
            ...(session.user.image !== undefined ? { image: session.user.image } : {}),
          });

          const fullUser = await UserAuthService.getUserById(dbUser.id);
          if (fullUser) {
            const user = toHominemUser(fullUser);
            setCachedUser(user);
            c.set('user', user);
            c.set('userId', fullUser.id);
            c.set('auth', {
              sub: fullUser.id,
              sid: session.session?.id ?? crypto.randomUUID(),
              scope: ['api:read', 'api:write'],
              role: fullUser.isAdmin ? 'admin' : 'user',
              amr: ['oauth'],
              authTime: Math.floor(Date.now() / 1000),
            });
          }
        }
      } catch (error) {
        logger.debug('[authJwtMiddleware] session resolution failed', { error });
      }
    }

    return await next();
  };
};
