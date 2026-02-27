import type { Queues } from '@hominem/services';

import { getServerAuth } from '@hominem/auth/server';
import { getOrCreateQueues } from '@hominem/services/queues';
import { logger } from '@hominem/utils/logger';
import { createMiddleware } from 'hono/factory';

import type { AppContext } from './auth';

/**
 * Context Setup Middleware
 *
 * Runs on EVERY request to initialize context (similar to previous createContext patterns).
 * Sets up:
 * - User authentication from Better Auth session and bearer token material
 * - Queue system for background jobs
 * - Response headers for cookies
 */
export const contextMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const responseHeaders = new Headers();

  // Initialize queues (matching legacy RPC context)
  const queues =
    process.env.NODE_ENV === 'test'
      ? {
          plaidSync: undefined as unknown as Queues['plaidSync'],
          importTransactions: undefined as unknown as Queues['importTransactions'],
          placePhotoEnrich: undefined as unknown as Queues['placePhotoEnrich'],
        }
      : getOrCreateQueues();

  c.set('queues', queues);

  // Test override for user (matching legacy RPC pattern)
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
          email: localUser.email,
          name: localUser.name ?? undefined,
          image: localUser.image ?? undefined,
          isAdmin: localUser.isAdmin,
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt,
        });
        c.set('userId', localUser.id);
      }

      await next();

      // Apply response headers
      responseHeaders.forEach((value, key) => {
        c.header(key, value);
      });
      return;
    }
  }

  // Production: Get auth from Better Auth-backed API session
  try {
    const request = c.req.raw;
    const authConfig = {
      apiBaseUrl: process.env.API_URL || 'http://localhost:3000',
    };

    const { user, headers, session, auth } = await getServerAuth(request, authConfig);

    // Copy auth headers (cookies) to response headers
    headers.forEach((value, key) => {
      responseHeaders.append(key, value);
    });

    if (user) {
      c.set('user', user);
      c.set('userId', user.id);
    }
    if (auth) {
      c.set('auth', auth);
    }

    // Session is available for bearer propagation where needed.
    if (session) {
      void session;
    }
  } catch (error) {
    logger.error('Error in context middleware', { error });
    // Continue without auth - let authMiddleware handle unauthorized access
  }

  await next();

  // Apply response headers (for cookies, etc)
  responseHeaders.forEach((value, key) => {
    c.header(key, value);
  });
});
