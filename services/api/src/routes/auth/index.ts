import { Hono } from 'hono';

import { betterAuthServer } from '../../auth/better-auth';
import { env } from '../../env';
import type { AppEnv } from '../../server';
import {
  buildSessionResponse,
  callBetterAuthPluginEndpoint,
  copyHeadersWithSetCookie,
  getBetterAuthSessionContext,
  jsonWithHeaders,
  type AuthDependencies,
} from './shared';
import { createTestAuthRoutes } from './test-routes';

export function createAuthRoutes(dependencies: AuthDependencies) {
  const { auth } = dependencies;
  const authRoutes = new Hono<AppEnv>();

  // Session / logout for SSR + first-party apps.
  // getServerAuth (packages/auth/src/server.ts) now hits Better Auth's own
  // GET /api/auth/get-session directly instead of going through this endpoint.
  // This route is only still here because apps/finance's logout action calls it
  // directly — remove once that's migrated to the native Better Auth endpoints.

  authRoutes.get('/session', async (c) => {
    try {
      const betterAuthSession = await getBetterAuthSessionContext(c, auth);
      if (!betterAuthSession) {
        return c.json({ isAuthenticated: false, user: null }, 401);
      }

      const sessionResponse = await buildSessionResponse({
        sessionId: betterAuthSession.sessionId,
        userId: betterAuthSession.userId,
      });

      if (!sessionResponse) {
        return c.json({ isAuthenticated: false, user: null }, 401);
      }

      return c.json(sessionResponse);
    } catch {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }
  });

  authRoutes.post('/logout', async (c) => {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/sign-out',
      method: 'POST',
      dependencies,
    }).catch(() => null);
    const headers = response ? copyHeadersWithSetCookie(response.headers) : new Headers();
    return jsonWithHeaders({ success: true }, 200, headers);
  });

  authRoutes.route('/', createTestAuthRoutes(dependencies));
  return authRoutes;
}

export const authRoutes = createAuthRoutes({ env, auth: betterAuthServer });
