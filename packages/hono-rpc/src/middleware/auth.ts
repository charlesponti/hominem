import type { HominemUser } from '@hominem/auth/server';
import type { Queues } from '@hominem/services/types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createMiddleware } from 'hono/factory';

/**
 * Application Context
 *
 * This defines the context available to all route handlers.
 * Much simpler than tRPC's context system.
 */
export interface AppContext {
  Variables: {
    user?: HominemUser;
    userId?: string;
    supabaseId?: string;
    supabase?: SupabaseClient;
    queues: Queues;
  };
}

/**
 * Authentication Middleware
 *
 * Protects routes that require authentication.
 * Returns 401 if user is not authenticated.
 */
export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const user = c.get('user');
  const userId = c.get('userId');

  if (!user || !userId) {
    return c.json(
      {
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
      401,
    );
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
