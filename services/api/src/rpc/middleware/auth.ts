import { createMiddleware } from 'hono/factory';

import type { AuthContext, AuthUser } from '../../auth/types';

export type RpcUser = AuthUser & { isAdmin: boolean };

import { UnauthorizedError } from '../errors';

// The Hono context shape available to every route handler.
export interface AppContext {
  Variables: {
    auth?: AuthContext;
    authError?:
      | 'invalid_token'
      | 'expired_token'
      | 'invalid_audience'
      | 'invalid_issuer'
      | 'disallowed_kid'
      | 'revoked_session'
      | 'insufficient_scope';
    requestId?: string;
  };
  Bindings: Record<string, unknown>;
}

// Guards routes that need a logged-in user; throws if there isn't one, and the
// global error middleware turns that into the actual HTTP response.
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const user = c.get('auth')?.user;
  const userId = c.get('auth')?.userId;
  const authError = c.get('authError');

  if (!user || !userId) {
    throw new UnauthorizedError('Authentication required', authError ? { authError } : undefined);
  }

  return await next();
});

// Tags each request with a short id so logs for the same request can be tied together.
export const requestIdMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  c.set('requestId', requestId);
  return await next();
});
