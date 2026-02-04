import type { HominemUser } from '@hominem/auth/server';
import type { Queues } from '@hominem/services';
import type { SupabaseClient } from '@supabase/supabase-js';

import { UnauthorizedError } from '@hominem/services';
import { createMiddleware } from 'hono/factory';

/**
 * Application Context
 *
 * This defines the context available to all route handlers.
 * Much simpler than the previous context system.
 */
export interface AppContext {
  Variables: {
    user?: HominemUser;
    userId?: string;
    supabaseId?: string;
    supabase?: SupabaseClient;
    queues?: Queues;
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

  if (!user || !userId) {
    throw new UnauthorizedError('Authentication required');
  }

  return await next();
});

/**
 * Public Middleware
 *
 * For routes that don't require authentication.
 */
export const publicMiddleware = createMiddleware<AppContext>(async (c, next) => {
  // Public routes - no auth check
  return await next();
});
