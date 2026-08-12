import { createHash } from 'node:crypto';

import { authDb } from '@hominem/db';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer, TEST_OTP } from '../auth/better-auth';
import { getLatestTestOtp, isTestOtpStoreEnabled } from '../auth/test-otp-store';
import { env } from '../env';
import { getClientIp } from '../middleware/client-ip';
import type { AppEnv } from '../server';

export const authRoutes = new Hono<AppEnv>();

const mobileE2eLoginSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(128).optional(),
});

const testOtpQuerySchema = z.object({
  email: z.string().email(),
  type: z.string().min(1).optional(),
});

interface AppSessionResponse {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    isAdmin: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

interface BetterAuthSessionContext {
  sessionId: string;
  userId: string;
}

function isE2eAuthEnabled() {
  return env.AUTH_E2E_ENABLED && env.NODE_ENV !== 'production';
}

function isTestOtpRetrievalEnabled() {
  return isTestOtpStoreEnabled();
}

function copyHeadersWithSetCookie(headers: Headers) {
  const copied = new Headers(headers);
  const setCookies = headers.getSetCookie();

  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) {
      copied.append('set-cookie', setCookie);
    }
  }

  return copied;
}

function getHeaderCarrier(c: { req: { raw: Request } }) {
  return {
    headers: c.req.raw.headers,
  };
}

async function getBetterAuthSessionContext(
  c: Context<AppEnv>,
): Promise<BetterAuthSessionContext | null> {
  const session = await betterAuthServer.api.getSession({
    ...getHeaderCarrier(c),
  });

  if (!session?.user?.id || !session.session?.id) {
    return null;
  }

  return {
    sessionId: session.session.id,
    userId: session.user.id,
  };
}

async function buildSessionResponse(input: {
  sessionId: string;
  userId: string;
}): Promise<AppSessionResponse | null> {
  const userRecord = await authDb
    .selectFrom('user')
    .selectAll()
    .where('id', '=', input.userId)
    .executeTakeFirst();

  if (!userRecord) {
    return null;
  }

  return {
    isAuthenticated: true,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      ...(userRecord.name ? { name: userRecord.name } : {}),
      isAdmin: false,
      ...(userRecord.createdAt ? { createdAt: userRecord.createdAt } : {}),
      ...(userRecord.updatedAt ? { updatedAt: userRecord.updatedAt } : {}),
    },
  };
}

function buildBetterAuthUrl(input: {
  request: Request;
  path?: string | undefined;
  preserveQuery?: boolean | undefined;
}) {
  const requestUrl = new URL(input.request.url);
  const targetPath = input.path ? `/api/auth${input.path}` : requestUrl.pathname;
  const targetUrl = new URL(targetPath, env.API_URL);

  if (input.preserveQuery) {
    targetUrl.search = requestUrl.search;
  }

  return targetUrl;
}

function ensureTrustedOrigin(headers: Headers) {
  const existingOrigin = headers.get('origin');
  if (existingOrigin && existingOrigin.length > 0) {
    return;
  }

  headers.set('origin', env.API_URL);
}

async function callBetterAuthPluginEndpoint(input: {
  request: Request;
  path: string;
  method: 'GET' | 'POST';
  preserveQuery?: boolean | undefined;
  body?: Record<string, unknown> | undefined;
}) {
  const url = buildBetterAuthUrl({
    request: input.request,
    path: input.path,
    ...(input.preserveQuery ? { preserveQuery: true } : {}),
  });
  const headers = new Headers(input.request.headers);
  ensureTrustedOrigin(headers);
  if (input.body) {
    headers.set('content-type', 'application/json');
  }

  return betterAuthServer.handler(
    new Request(url.toString(), {
      method: input.method,
      headers,
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    }),
  );
}

function jsonWithHeaders(body: Record<string, unknown>, status: number, headers?: Headers) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

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

// ---------------------------------------------------------------------------
// Test / e2e helpers (non-production)
// ---------------------------------------------------------------------------

authRoutes.post('/mobile/e2e/login', zValidator('json', mobileE2eLoginSchema), async (c) => {
  const clientIp = getClientIp(c);
  const userAgent = c.req.header('user-agent') ?? 'unknown';
  const shouldLogE2eAudit = process.env.VITEST !== 'true';
  const auditContext = {
    actor: 'mobile-e2e-client',
    clientIp,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    userAgent,
  };

  if (!isE2eAuthEnabled()) {
    if (shouldLogE2eAudit) {
      logger.warn('[auth:e2e:mobile] denied because E2E auth is disabled', {
        ...auditContext,
        denialReason: 'e2e_auth_disabled',
      });
    }
    return c.json({ error: 'not_found' }, 404);
  }

  const providedSecret = c.req.header('x-e2e-auth-secret');
  if (!providedSecret || !env.AUTH_E2E_SECRET || providedSecret !== env.AUTH_E2E_SECRET) {
    if (shouldLogE2eAudit) {
      logger.warn('[auth:e2e:mobile] denied because secret header is invalid', {
        ...auditContext,
        denialReason: 'invalid_secret',
        hasProvidedSecret: Boolean(providedSecret),
      });
    }
    return c.json({ error: 'forbidden' }, 403);
  }

  const payload = c.req.valid('json');
  const email = payload.email ?? 'mobile-e2e@hominem.test';
  const name = payload.name ?? 'Mobile E2E User';
  const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 16);

  // Establish a real Better Auth session via email OTP (fixed test code in non-prod).
  // Better Auth creates the user on first OTP sign-in when needed.
  const sendResponse = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/email-otp/send-verification-otp',
    method: 'POST',
    body: { email, type: 'sign-in' },
  });

  if (!sendResponse.ok) {
    const sendBody = await sendResponse.text().catch(() => '');
    logger.error('[auth:e2e:mobile] failed to send OTP', {
      ...auditContext,
      emailHash,
      status: sendResponse.status,
      body: sendBody.slice(0, 500),
    });
    return c.json({ error: 'e2e_otp_send_failed' }, 500);
  }

  const signInResponse = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/sign-in/email-otp',
    method: 'POST',
    body: { email, otp: TEST_OTP, name },
  });

  if (!signInResponse.ok) {
    const signInBodyText = await signInResponse.text().catch(() => '');
    logger.error('[auth:e2e:mobile] failed to sign in with OTP', {
      ...auditContext,
      emailHash,
      status: signInResponse.status,
      body: signInBodyText.slice(0, 500),
    });
    return c.json({ error: 'e2e_sign_in_failed' }, 500);
  }

  const signInBody = (await signInResponse.json().catch(() => null)) as {
    user?: { id?: string; email?: string; name?: string | null };
    session?: { id?: string };
  } | null;

  const userId = signInBody?.user?.id;
  if (!userId) {
    return c.json({ error: 'e2e_user_missing' }, 500);
  }

  if (shouldLogE2eAudit) {
    logger.info('[auth:e2e:mobile] established Better Auth session', {
      ...auditContext,
      emailHash,
      userId,
      sessionId: signInBody?.session?.id,
    });
  }

  const headers = copyHeadersWithSetCookie(signInResponse.headers);
  headers.set('content-type', 'application/json');

  return new Response(
    JSON.stringify({
      provider: 'better-auth',
      session_id: signInBody?.session?.id ?? null,
      user: {
        id: userId,
        email: signInBody?.user?.email ?? email,
        name: signInBody?.user?.name ?? name,
      },
    }),
    { status: 200, headers },
  );
});

authRoutes.get('/test/otp/latest', zValidator('query', testOtpQuerySchema), async (c) => {
  if (!isTestOtpRetrievalEnabled()) {
    return c.json({ error: 'not_found' }, 404);
  }

  const providedSecret = c.req.header('x-e2e-auth-secret');
  if (!providedSecret || providedSecret !== env.AUTH_E2E_SECRET) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const query = c.req.valid('query');
  const record = getLatestTestOtp({
    email: query.email,
    ...(query.type ? { type: query.type } : {}),
  });

  if (!record) {
    return c.json({ error: 'otp_not_found' }, 404);
  }

  return c.json({
    email: record.email,
    otp: record.otp,
    type: record.type,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  });
});
