import { Hono } from 'hono';

import type { AppEnv } from '../../server';
import {
  buildSessionResponse,
  callBetterAuthPluginEndpoint,
  copyHeadersWithSetCookie,
  getBetterAuthSessionContext,
  jsonWithHeaders,
} from './shared';
import { testAuthRoutes } from './test-routes';

export const authRoutes = new Hono<AppEnv>();

// ---------------------------------------------------------------------------
// Session / logout (SSR + first-party apps)
//
// getServerAuth (packages/auth/src/server.ts) now calls Better Auth's own
// GET /api/auth/get-session directly instead of this reshaped endpoint.
// This route stays because apps/finance still calls it directly (its logout
// action) — remove once those callers
// migrate to the native Better Auth session/sign-out endpoints too.
// ---------------------------------------------------------------------------

authRoutes.get('/session', async (c) => {
  try {
    const betterAuthSession = await getBetterAuthSessionContext(c);
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
  }).catch(() => null);
  const headers = response ? copyHeadersWithSetCookie(response.headers) : new Headers();
  return jsonWithHeaders({ success: true }, 200, headers);
});

authRoutes.route('/', testAuthRoutes);
