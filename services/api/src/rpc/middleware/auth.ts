import type { User } from '@hominem/auth/server';
import type { AuthEnvelope } from '@hominem/auth/types';
import { createMiddleware } from 'hono/factory';

import { ForbiddenError, UnauthorizedError } from '../errors';

/**
 * Application Context
 *
 * This defines the context available to all route handlers.
 * Much simpler than the previous context system.
 */
export interface AppContext {
  Variables: {
    user?: User;
    userId?: string;
    auth?: AuthEnvelope;
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
  const user = c.get('user');
  const userId = c.get('userId');
  const authError = c.get('authError');

  if (!user || !userId) {
    throw new UnauthorizedError('Authentication required', authError ? { authError } : undefined);
  }

  return await next();
});

/**
 * Admin Middleware
 *
 * Requires the authenticated user to have isAdmin = true.
 * Must be used after the context middleware that sets user/userId.
 */
export const adminMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const user = c.get('user');
  const userId = c.get('userId');

  if (!user || !userId) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!user.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  return await next();
});

/**
 * Public Middleware
 *
 * For routes that don't require authentication.
 */
export const publicMiddleware = createMiddleware<AppContext>(async (_c, next) => {
  // Public routes - no auth check
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
