import type { Queues } from '@hominem/services/types';

import { getServerAuth } from '@hominem/auth/server';
import { getOrCreateQueues } from '@hominem/services/queues';
import { createMiddleware } from 'hono/factory';

import type { AppContext } from './auth';

/**
 * Context Setup Middleware
 *
 * Runs on EVERY request to initialize context (like tRPC's createContext).
 * Sets up:
 * - User authentication from Supabase
 * - Queue system for background jobs
 * - Response headers for cookies
 * - Supabase client
 */
export const contextMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const responseHeaders = new Headers();

  // Initialize queues (matching legacy tRPC context)
  const queues =
    process.env.NODE_ENV === 'test'
      ? {
          plaidSync: undefined as unknown as Queues['plaidSync'],
          importTransactions: undefined as unknown as Queues['importTransactions'],
          placePhotoEnrich: undefined as unknown as Queues['placePhotoEnrich'],
        }
      : getOrCreateQueues();

  c.set('queues', queues);

  // Test override for user (matching tRPC pattern)
  if (process.env.NODE_ENV === 'test') {
    const testUserId = c.req.header('x-user-id');
    if (testUserId) {
      const { UserAuthService } = await import('@hominem/auth/server');
      const localUser = await UserAuthService.findByIdOrEmail({
        id: testUserId,
      });

      if (localUser) {
        c.set('user', {
          id: localUser.id,
          supabaseId: localUser.supabaseId,
          email: localUser.email,
          name: localUser.name ?? undefined,
          image: localUser.image ?? undefined,
          isAdmin: localUser.isAdmin,
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt,
        });
        c.set('userId', localUser.id);
        c.set('supabaseId', localUser.supabaseId);
      }

      await next();

      // Apply response headers
      responseHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return;
    }
  }

  // Production: Get auth from Supabase
  try {
    const request = c.req.raw;
    const authConfig = {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    };

    const { user, headers, session } = await getServerAuth(request, authConfig);

    // Copy auth headers (cookies) to response headers
    headers.forEach((value, key) => {
      responseHeaders.append(key, value);
    });

    if (user) {
      c.set('user', user);
      c.set('userId', user.id);
      c.set('supabaseId', user.supabaseId);
    }

    // Set Supabase client if session exists
    if (session) {
      // We could initialize a Supabase client here if needed
      // For now, services handle their own Supabase clients
    }
  } catch (error) {
    console.error('Error in context middleware:', error);
    // Continue without auth - let authMiddleware handle unauthorized access
  }

  await next();

  // Apply response headers (for cookies, etc)
  responseHeaders.forEach((value, key) => {
    c.header(key, value);
  });
});
