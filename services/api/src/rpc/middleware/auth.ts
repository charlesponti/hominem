import { createMiddleware } from 'hono/factory';

import type { AuthContext, AuthUser } from '../../auth/types';

export type RpcUser = AuthUser & { isAdmin: boolean };

import { UnauthorizedError } from '../errors';

/**
 * Application Context
 *
 * This defines the context available to all route handlers.
 * Much simpler than the previous context system.
 */
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

/**
 * Authentication Middleware
 *
 * Protects routes that require authentication.
 * Throws UnauthorizedError if user is not authenticated.
 * Global error middleware catches and converts to REST response.
 */
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const user = c.get('auth')?.user;
  const userId = c.get('auth')?.userId;
  const authError = c.get('authError');

  if (!user || !userId) {
    throw new UnauthorizedError('Authentication required', authError ? { authError } : undefined);
  }

  return await next();
});

/**
 * Request ID Middleware
 *
 * Generates and propagates a unique request ID for tracing.
 * Useful for correlating logs across the request lifecycle.
 */
export const requestIdMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  c.set('requestId', requestId);
  return await next();
});
