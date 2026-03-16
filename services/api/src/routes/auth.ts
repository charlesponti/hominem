import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  UserAuthService,
  configureStepUpStore,
  grantStepUp,
  hasRecentStepUp,
  isFreshPasskeyAuth,
} from '@hominem/auth/server';
import { STEP_UP_ACTIONS, isStepUpAction } from '@hominem/auth/step-up-actions';
import type { StepUpAction } from '@hominem/auth/step-up-actions';
import { db } from '@hominem/db';
import { redis } from '@hominem/services/redis';
import { getSetCookieHeaders } from '@hominem/utils/headers';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer } from '../auth/better-auth';
import { getJwks } from '../auth/key-store';
import { isSessionRevoked, revokeSession, rotateRefreshToken } from '../auth/session-store';
import { getLatestTestOtp, isTestOtpStoreEnabled } from '../auth/test-otp-store';
import { issueAccessToken, verifyAccessToken } from '../auth/tokens';
import { env } from '../env';
import type { AppEnv } from '../server';

export const authRoutes = new Hono<AppEnv>();

configureStepUpStore(redis);

const devIssueTokenSchema = z.object({
  userId: z.string().uuid(),
  scope: z.array(z.string()).optional(),
  role: z.enum(['user', 'admin']).optional(),
  sid: z.string().uuid().optional(),
});

const refreshTokenSchema = z
  .union([
    z.object({
      refresh_token: z.string().min(16),
    }),
    z.object({
      refreshToken: z.string().min(16),
    }),
  ])
  .transform((value) => ({
    refreshToken: 'refresh_token' in value ? value.refresh_token : value.refreshToken,
  }));

const passkeyRegisterVerifySchema = z.object({
  response: z.any(),
  name: z.string().optional(),
});

const passkeyAuthVerifySchema = z.object({
  response: z.any(),
  action: z.string().min(1).optional(),
});
const emailOtpRequestSchema = z.object({
  email: z.string().email(),
  type: z
    .enum(['sign-in', 'change-email', 'email-verification', 'forget-password'])
    .default('sign-in'),
});
const emailOtpVerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(12),
  name: z.string().min(1).max(128).optional(),
  image: z.string().url().optional(),
});

const deviceCodeSchema = z.object({
  client_id: z.string().min(1),
  scope: z.string().optional(),
});

const deviceTokenSchema = z.object({
  grant_type: z.literal('urn:ietf:params:oauth:grant-type:device_code'),
  device_code: z.string().min(1),
  client_id: z.string().min(1),
});
const deviceVerifySchema = z.object({
  user_code: z.string().min(1),
});
const deviceApproveSchema = z.object({
  userCode: z.string().min(1),
});

const mobileE2eLoginSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(128).optional(),
  amr: z.array(z.string()).optional(),
});
const testOtpQuerySchema = z.object({
  email: z.string().email(),
  type: z.string().min(1).optional(),
});

const AUTH_REFRESH_LIMIT_WINDOW_SECONDS = 60;
const AUTH_REFRESH_LIMIT_MAX = 25;
const AUTH_DEVICE_CODE_LIMIT_WINDOW_SECONDS = 10 * 60;
const AUTH_DEVICE_CODE_LIMIT_MAX = 10;
const AUTH_DEVICE_TOKEN_LIMIT_WINDOW_SECONDS = 10 * 60;
const AUTH_DEVICE_TOKEN_LIMIT_MAX = 120;
const AUTH_E2E_LOGIN_LIMIT_WINDOW_SECONDS = 60;
const AUTH_E2E_LOGIN_LIMIT_MAX = 20;

interface AuthRateLimitInput {
  bucket: string;
  identifier: string;
  windowSec: number;
  max: number;
}

interface MobileE2eLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  refresh_family_id: string;
  provider: 'better-auth';
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

interface BetterAuthSessionContext {
  sessionId: string;
  userId: string;
}

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
  auth?: {
    sub: string;
    sid: string;
    scope: string[];
    role: 'user' | 'admin';
    amr: string[];
    authTime: number;
  };
  accessToken?: string;
  expiresIn?: number;
  tokenType?: 'Bearer';
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOtpCode(otp: string) {
  return otp.replace(/\D/g, '');
}

function jsonWithHeaders(body: Record<string, unknown>, status: number, headers?: Headers) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function getHeaderCarrier(c: { req: { raw: Request } }) {
  return {
    headers: c.req.raw.headers,
  };
}

/**
 * Resolve the authenticated user ID for /api/auth routes.
 * The standard JWT middleware skips /api/auth paths so these routes must
 * check auth themselves.  We support three mechanisms (in priority order):
 *   1. Middleware-set context variable (set for non-/api/auth routes)
 *   2. Better Auth bearer/session auth
 *   3. Legacy bearer token in the Authorization header
 */
async function resolveAuthUserId(c: {
  get: (key: string) => string | null;
  req: { raw: Request; header: (name: string) => string | undefined };
}): Promise<string | null> {
  // 1. Middleware already resolved it
  const fromMiddleware = c.get('userId');
  if (fromMiddleware) return fromMiddleware;

  const betterAuthSession = await getBetterAuthSessionContext(c as Context<AppEnv>);
  if (betterAuthSession) {
    return betterAuthSession.userId;
  }

  const authHeader = c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const claims = await verifyAccessToken(authHeader.slice(7));
      if (claims?.sub) return claims.sub;
    } catch {
      // invalid token — fall through
    }
  }

  return null;
}

async function resolveAuthSessionId(c: {
  get: (key: string) => { sid?: string | undefined } | null;
  req: { raw: Request; header: (name: string) => string | undefined };
}): Promise<string | null> {
  const fromMiddleware = c.get('auth');
  if (fromMiddleware?.sid) {
    return fromMiddleware.sid;
  }

  const betterAuthSession = await getBetterAuthSessionContext(c as Context<AppEnv>);
  if (betterAuthSession) {
    return betterAuthSession.sessionId;
  }

  const authHeader = c.req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const claims = await verifyAccessToken(authHeader.slice(7));
      return claims.sid;
    } catch {
      return null;
    }
  }

  return null;
}

function isE2eAuthEnabled() {
  return env.AUTH_E2E_ENABLED && env.NODE_ENV !== 'production';
}

function isTestOtpRetrievalEnabled() {
  return isTestOtpStoreEnabled();
}

async function createEmailOtpAuthResponse(dbUser: {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
}) {
  const access = await issueAccessToken({
    sub: dbUser.id,
    sid: randomUUID(),
    role: dbUser.is_admin ? 'admin' : 'user',
    scope: ['api:read', 'api:write'],
    amr: ['email_otp', 'better-auth-session'],
  });

  const headers = new Headers();

  return new Response(
    JSON.stringify({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        ...(dbUser.name ? { name: dbUser.name } : {}),
      },
      accessToken: access.accessToken,
      expiresIn: access.expiresIn,
      tokenType: access.tokenType,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        ...Object.fromEntries(headers.entries()),
      },
    },
  );
}

async function signInWithBetterAuthEmailOtp(
  c: Context<AppEnv>,
  payload: z.infer<typeof emailOtpVerifySchema>,
) {
  const response = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/sign-in/email-otp',
    method: 'POST',
    body: payload as Record<string, unknown>,
  });
  const body = await response.text();

  if (!response.ok) {
    return new Response(body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
  }

  try {
    const parsed = JSON.parse(body) as { user?: { id?: string } };
    const userId = parsed.user?.id;

    if (!userId) {
      return c.json({ error: 'user_id_missing' }, 400);
    }

    const dbUser = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!dbUser) {
      return c.json({ error: 'user_not_found' }, 400);
    }

    const authResponse = await createEmailOtpAuthResponse(dbUser);
    const responseHeaders = copyHeadersWithSetCookie(response.headers);
    responseHeaders.set('content-type', 'application/json');
    const authBody = await authResponse.text();
    return new Response(authBody, { status: 200, headers: responseHeaders });
  } catch (error) {
    logger.error('[auth:email-otp] sign-in failed', { error });
    return c.json({ error: 'sign_in_failed' }, 500);
  }
}

async function getRedis() {
  const { redis } = await import('@hominem/services/redis');
  return redis;
}

function getClientIp(c: Context<AppEnv>) {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded && forwarded.length > 0) {
    const [first] = forwarded.split(',');
    return first?.trim() ?? 'unknown';
  }
  return c.req.header('x-real-ip') ?? 'unknown';
}

function hashRateLimitIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

async function enforceAuthRateLimit(c: Context<AppEnv>, input: AuthRateLimitInput) {
  try {
    const redis = await getRedis();
    const key = `ratelimit:auth:${input.bucket}:${hashRateLimitIdentifier(input.identifier)}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, input.windowSec);
    }

    c.header('X-RateLimit-Limit', String(input.max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, input.max - count)));

    if (count > input.max) {
      return c.json(
        {
          error: 'rate_limit_exceeded',
          message: 'Auth rate limit exceeded. Retry later.',
        },
        429,
      );
    }
  } catch {
    // Fail open on cache failures to preserve auth availability.
  }

  return null;
}

function getBearerToken(headerValue?: string) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  return headerValue.slice(7);
}

async function hasRecentPasskeyBearerAuth(c: Context<AppEnv>) {
  const bearerToken = getBearerToken(c.req.header('authorization'));
  if (!bearerToken) {
    return false;
  }

  try {
    const claims = await verifyAccessToken(bearerToken);
    return isFreshPasskeyAuth({
      amr: claims.amr,
      authTime: claims.auth_time,
    });
  } catch {
    return false;
  }
}

async function hasSatisfiedStepUp(c: Context<AppEnv>, userId: string, action: StepUpAction) {
  if (await hasRecentStepUp(userId, action)) {
    return true;
  }

  return hasRecentPasskeyBearerAuth(c);
}

async function userHasRegisteredPasskeys(userId: string) {
  const existingPasskey = await db
    .selectFrom('user_passkey')
    .select('id')
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();

  return Boolean(existingPasskey);
}

async function requiresPasskeyRegisterStepUp(c: Context<AppEnv>, userId: string) {
  if (!(await userHasRegisteredPasskeys(userId))) {
    return false;
  }

  return !(await hasSatisfiedStepUp(c, userId, STEP_UP_ACTIONS.PASSKEY_REGISTER));
}

function copyHeadersWithSetCookie(headers: Headers) {
  const copied = new Headers(headers);
  const setCookies = getSetCookieHeaders(headers);

  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) {
      copied.append('set-cookie', setCookie);
    }
  }

  return copied;
}

async function getBetterAuthSessionContext(
  c: Context<AppEnv>,
): Promise<BetterAuthSessionContext | null> {
  const session = await betterAuthServer.api.getSession({
    ...getHeaderCarrier(c),
  });

  if (!session?.user?.id) {
    return null;
  }

  const sessionId = session.session?.id;
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    userId: session.user.id,
  };
}

async function buildSessionResponse(input: {
  sessionId: string;
  userId: string;
  amr: string[];
  includeBearerToken?: boolean;
}): Promise<AppSessionResponse | null> {
  const userRecord = await UserAuthService.findByIdOrEmail({ id: input.userId });
  if (!userRecord) {
    return null;
  }

  const response: AppSessionResponse = {
    isAuthenticated: true,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      ...(userRecord.name ? { name: userRecord.name } : {}),
      isAdmin: userRecord.is_admin ?? false,
      ...(userRecord.created_at ? { createdAt: userRecord.created_at } : {}),
      ...(userRecord.updated_at ? { updatedAt: userRecord.updated_at } : {}),
    },
    auth: {
      sub: userRecord.id,
      sid: input.sessionId,
      scope: ['api:read', 'api:write'],
      role: userRecord.is_admin ? 'admin' : 'user',
      amr: input.amr,
      authTime: Math.floor(Date.now() / 1000),
    },
  };

  if (input.includeBearerToken !== false) {
    const access = await issueAccessToken({
      sub: userRecord.id,
      sid: input.sessionId,
      role: userRecord.is_admin ? 'admin' : 'user',
      scope: ['api:read', 'api:write'],
      amr: input.amr,
    });

    response.accessToken = access.accessToken;
    response.expiresIn = access.expiresIn;
    response.tokenType = access.tokenType;
  }

  return response;
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
  logger.debug('[auth:plugin] forwarding Better Auth endpoint', {
    method: input.method,
    targetUrl: url.toString(),
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

async function forwardBetterAuthPluginResponse(input: {
  request: Request;
  path: string;
  method: 'GET' | 'POST';
  preserveQuery?: boolean | undefined;
  body?: Record<string, unknown> | undefined;
}) {
  const response = await callBetterAuthPluginEndpoint(input);
  const responseText = await response.text();
  const headers = copyHeadersWithSetCookie(response.headers);

  if (input.path === '/device/token' && !headers.get('set-auth-token')) {
    const payload = JSON.parse(responseText) as { access_token?: string };
    if (typeof payload.access_token === 'string' && payload.access_token.length > 0) {
      headers.set('set-auth-token', payload.access_token);
      const exposedHeaders = headers.get('access-control-expose-headers');
      const exposed = new Set(
        (exposedHeaders ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      );
      exposed.add('set-auth-token');
      headers.set('access-control-expose-headers', [...exposed].join(', '));
    }
  }

  return new Response(responseText, {
    status: response.status,
    headers,
  });
}

authRoutes.get('/jwks', async (c) => {
  return c.json(await getJwks());
});

authRoutes.post('/mobile/e2e/login', zValidator('json', mobileE2eLoginSchema), async (c) => {
  const clientIp = getClientIp(c);
  const userAgent = c.req.header('user-agent') ?? 'unknown';
  const auditContext = {
    actor: 'mobile-e2e-client',
    clientIp,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    userAgent,
  };

  if (!isE2eAuthEnabled()) {
    logger.warn('[auth:e2e:mobile] denied because E2E auth is disabled', {
      ...auditContext,
      denialReason: 'e2e_auth_disabled',
    });
    return c.json({ error: 'not_found' }, 404);
  }

  const providedSecret = c.req.header('x-e2e-auth-secret');
  if (!providedSecret || !env.AUTH_E2E_SECRET || providedSecret !== env.AUTH_E2E_SECRET) {
    logger.warn('[auth:e2e:mobile] denied because secret header is invalid', {
      ...auditContext,
      denialReason: 'invalid_secret',
      hasProvidedSecret: Boolean(providedSecret),
    });
    return c.json({ error: 'forbidden' }, 403);
  }

  const e2eLoginRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'mobile-e2e-login',
    identifier: getClientIp(c),
    windowSec: AUTH_E2E_LOGIN_LIMIT_WINDOW_SECONDS,
    max: AUTH_E2E_LOGIN_LIMIT_MAX,
  });
  if (e2eLoginRateLimit) {
    return e2eLoginRateLimit;
  }

  const payload = c.req.valid('json');
  const email = payload.email ?? 'mobile-e2e@hominem.test';
  const name = payload.name ?? 'Mobile E2E User';
  const amr = payload.amr && payload.amr.length > 0 ? payload.amr : ['e2e', 'mobile'];
  const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 16);

  const existingUser = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', email)
    .limit(1)
    .executeTakeFirst();

  const user =
    existingUser ??
    (await db
      .insertInto('users')
      .values({
        id: randomBytes(16).toString('hex'),
        email,
        name,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .executeTakeFirst());

  if (!user) {
    logger.error('[auth:e2e:mobile] failed to create or fetch user', {
      clientIp,
      emailHash,
    });
    return c.json({ error: 'e2e_user_create_failed' }, 500);
  }

  const accessToken = await issueAccessToken({
    sub: user.id,
    sid: crypto.randomUUID(),
    scope: ['api:read', 'api:write'],
    role: user.is_admin ? 'admin' : 'user',
    amr,
  });
  const refreshToken = randomBytes(32).toString('base64url');
  const sessionId = crypto.randomUUID();
  const refreshFamilyId = crypto.randomUUID();

  logger.info('[auth:e2e:mobile] issued token pair', {
    ...auditContext,
    emailHash,
    userId: user.id,
    sessionId,
    refreshFamilyId,
  });

  const response: MobileE2eLoginResponse = {
    access_token: accessToken.accessToken,
    refresh_token: refreshToken,
    token_type: accessToken.tokenType,
    expires_in: accessToken.expiresIn,
    session_id: sessionId,
    refresh_family_id: refreshFamilyId,
    provider: 'better-auth',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };

  return c.json(response);
});

authRoutes.post('/email-otp/send', zValidator('json', emailOtpRequestSchema), async (c) => {
  try {
    const payload = c.req.valid('json');
    const normalizedPayload = {
      ...payload,
      email: normalizeAuthEmail(payload.email),
    };
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/email-otp/send-verification-otp',
      method: 'POST',
      body: normalizedPayload as Record<string, unknown>,
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
  } catch {
    return c.json({ error: 'email_otp_send_failed' }, 400);
  }
});

authRoutes.post('/email-otp/verify', zValidator('json', emailOtpVerifySchema), async (c) => {
  try {
    const payload = c.req.valid('json');
    const normalizedPayload = {
      ...payload,
      email: normalizeAuthEmail(payload.email),
      otp: normalizeOtpCode(payload.otp),
    };

    return signInWithBetterAuthEmailOtp(c, normalizedPayload);
  } catch {
    return c.json({ error: 'email_otp_verify_failed' }, 400);
  }
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

authRoutes.post('/logout', async (c) => {
  const sessionId = await resolveAuthSessionId(c);
  if (sessionId) {
    await revokeSession(sessionId);
  }
  const response = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/sign-out',
    method: 'POST',
  }).catch(() => null);
  const headers = response ? copyHeadersWithSetCookie(response.headers) : new Headers();
  return jsonWithHeaders({ success: true }, 200, headers);
});

authRoutes.get('/session', async (c) => {
  // Identity-only endpoint.
  // The JWT middleware bypasses all /api/auth/* routes, so we validate the
  // bearer token directly here, or fall back to the Better Auth session cookie.

  const authHeader = c.req.header('authorization') ?? '';
  let bearerToken: string | null = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearerToken) {
    try {
      const betterAuthSession = await getBetterAuthSessionContext(c);
      if (betterAuthSession) {
        const sessionResponse = await buildSessionResponse({
          sessionId: betterAuthSession.sessionId,
          userId: betterAuthSession.userId,
          amr: ['better-auth-session'],
          includeBearerToken: false,
        });

        if (sessionResponse) {
          return c.json(sessionResponse);
        }
      }
    } catch {
      // Fall through to legacy bearer validation for callers that still use it.
    }

    try {
      const claims = await verifyAccessToken(bearerToken);
      const revoked = await isSessionRevoked(claims.sid);
      if (revoked) {
        return c.json({ isAuthenticated: false, user: null }, 401);
      }

      const userRecord = await UserAuthService.findByIdOrEmail({ id: claims.sub });
      if (!userRecord) {
        return c.json({ isAuthenticated: false, user: null }, 401);
      }

      return c.json({
        isAuthenticated: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          ...(userRecord.name ? { name: userRecord.name } : {}),
          isAdmin: userRecord.is_admin ?? false,
          ...(userRecord.created_at ? { createdAt: userRecord.created_at } : {}),
          ...(userRecord.updated_at ? { updatedAt: userRecord.updated_at } : {}),
        },
        auth: {
          sub: claims.sub,
          sid: claims.sid,
          scope: claims.scope,
          role: claims.role,
          amr: claims.amr,
          authTime: claims.auth_time,
        },
        accessToken: bearerToken,
        expiresIn:
          typeof claims.exp === 'number'
            ? Math.max(claims.exp - Math.floor(Date.now() / 1000), 0)
            : undefined,
      });
    } catch {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }
  }

  try {
    const betterAuthSession = await getBetterAuthSessionContext(c);
    if (!betterAuthSession) {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }

    const sessionResponse = await buildSessionResponse({
      sessionId: betterAuthSession.sessionId,
      userId: betterAuthSession.userId,
      amr: ['better-auth-session'],
      includeBearerToken: false,
    });

    if (!sessionResponse) {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }

    return c.json(sessionResponse);
  } catch {
    return c.json({ isAuthenticated: false, user: null }, 401);
  }
});

authRoutes.post('/refresh', async (c) => {
  void c;
  return c.json(
    {
      error: 'deprecated_endpoint',
      message:
        'Use Better Auth session cookies for first-party apps or POST /api/auth/token for explicit refresh-token exchanges.',
    },
    410,
  );
});

authRoutes.post('/verify', async (c) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ valid: false, error: 'missing_bearer_token' }, 400);
  }

  try {
    const claims = await verifyAccessToken(authHeader.slice(7));
    return c.json({ valid: true, claims });
  } catch {
    return c.json({ valid: false, error: 'invalid_token' }, 401);
  }
});

authRoutes.post('/dev/issue-token', zValidator('json', devIssueTokenSchema), async (c) => {
  if (!(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
    return c.json({ error: 'not_available' }, 404);
  }

  const { userId, scope, role, sid } = c.req.valid('json');
  const token = await issueAccessToken({
    sub: userId,
    sid: sid ?? crypto.randomUUID(),
    ...(scope ? { scope } : {}),
    ...(role ? { role } : {}),
    amr: ['dev'],
  });

  return c.json({
    access_token: token.accessToken,
    token_type: token.tokenType,
    expires_in: token.expiresIn,
    provider: 'better-auth' as const,
  });
});

authRoutes.post('/token', async (c) => {
  const contentType = c.req.header('content-type') ?? '';
  const payload = contentType.includes('application/x-www-form-urlencoded')
    ? Object.fromEntries(new URLSearchParams(await c.req.text()))
    : ((await c.req.json().catch(() => ({}))) as Record<string, unknown>);

  const grantType = typeof payload.grant_type === 'string' ? payload.grant_type : null;
  if (grantType !== 'refresh_token') {
    return c.json(
      {
        error: 'unsupported_grant_type',
        message: 'Only refresh_token grant is available on this endpoint in phase 1.',
      },
      400,
    );
  }

  const parsed = refreshTokenSchema.safeParse(payload);
  const refreshToken = parsed.success ? parsed.data.refreshToken : null;

  if (!refreshToken) {
    return c.json(
      {
        error: 'invalid_request',
        message: parsed.success ? 'Refresh token is required.' : parsed.error.message,
      },
      400,
    );
  }

  const tokenRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'refresh-token',
    identifier: `${getClientIp(c)}:${refreshToken.slice(0, 16)}`,
    windowSec: AUTH_REFRESH_LIMIT_WINDOW_SECONDS,
    max: AUTH_REFRESH_LIMIT_MAX,
  });
  if (tokenRateLimit) {
    return tokenRateLimit;
  }

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated.ok) {
    return c.json({ error: rotated.error }, 401);
  }

  return c.json({
    access_token: rotated.accessToken,
    refresh_token: rotated.refreshToken,
    token_type: rotated.tokenType,
    expires_in: rotated.expiresIn,
    session_id: rotated.sessionId,
    refresh_family_id: rotated.refreshFamilyId,
    provider: 'better-auth' as const,
  });
});

authRoutes.post('/token-from-session', async (c) => {
  void c;
  return c.json(
    {
      error: 'deprecated_endpoint',
      message: 'First-party apps must use Better Auth session cookies and GET /api/auth/session.',
    },
    410,
  );
});

authRoutes.post('/passkey/register/options', async (c) => {
  const userId = await resolveAuthUserId(c);
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  if (await requiresPasskeyRegisterStepUp(c, userId)) {
    return c.json({ error: 'step_up_required', action: STEP_UP_ACTIONS.PASSKEY_REGISTER }, 403);
  }

  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/passkey/generate-register-options',
      method: 'GET',
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: copyHeadersWithSetCookie(response.headers),
    });
  } catch {
    return c.json({ error: 'passkey_options_failed' }, 400);
  }
});

authRoutes.post(
  '/passkey/register/verify',
  zValidator('json', passkeyRegisterVerifySchema),
  async (c) => {
    const userId = await resolveAuthUserId(c);
    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    if (await requiresPasskeyRegisterStepUp(c, userId)) {
      return c.json({ error: 'step_up_required', action: STEP_UP_ACTIONS.PASSKEY_REGISTER }, 403);
    }

    try {
      const response = await callBetterAuthPluginEndpoint({
        request: c.req.raw,
        path: '/passkey/verify-registration',
        method: 'POST',
        body: c.req.valid('json') as Record<string, unknown>,
      });
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: copyHeadersWithSetCookie(response.headers),
      });
    } catch {
      return c.json({ error: 'passkey_registration_failed' }, 400);
    }
  },
);

authRoutes.get('/passkeys', async (c) => {
  // Returns the list of passkeys registered to the authenticated user.
  // Used by clients to decide whether to show the passkey enrollment prompt.
  const userId = await resolveAuthUserId(c);
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/passkey/list-user-passkeys',
      method: 'GET',
    });
    const body = (await response.json()) as unknown;
    return c.json(body as Record<string, unknown>, response.status as 200 | 400 | 401);
  } catch {
    return c.json({ error: 'passkey_list_failed' }, 400);
  }
});

authRoutes.delete(
  '/passkey/delete',
  zValidator('json', z.object({ id: z.string() })),
  async (c) => {
    // Deletes a passkey for the authenticated user.
    const userId = await resolveAuthUserId(c);
    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    if (!(await hasSatisfiedStepUp(c, userId, STEP_UP_ACTIONS.PASSKEY_DELETE))) {
      return c.json({ error: 'step_up_required', action: STEP_UP_ACTIONS.PASSKEY_DELETE }, 403);
    }

    try {
      const { id } = c.req.valid('json');
      const response = await callBetterAuthPluginEndpoint({
        request: c.req.raw,
        path: '/passkey/delete-user-passkey',
        method: 'POST',
        body: { id },
      });
      const body = (await response.json()) as unknown;
      return c.json(body as Record<string, unknown>, response.status as 200 | 400 | 401);
    } catch {
      return c.json({ error: 'passkey_delete_failed' }, 400);
    }
  },
);

authRoutes.post('/passkey/auth/options', async (c) => {
  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/passkey/generate-authenticate-options',
      method: 'GET',
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: copyHeadersWithSetCookie(response.headers),
    });
  } catch {
    return c.json({ error: 'passkey_options_failed' }, 400);
  }
});

authRoutes.post('/passkey/auth/verify', zValidator('json', passkeyAuthVerifySchema), async (c) => {
  try {
    const body = c.req.valid('json');
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/passkey/verify-authentication',
      method: 'POST',
      body: { response: body.response },
    });
    const responseText = await response.text();

    if (!response.ok) {
      return new Response(responseText, {
        status: response.status,
        headers: copyHeadersWithSetCookie(response.headers),
      });
    }

    // Handle step-up action grant (for authenticated users doing re-auth)
    const existingUserId = await resolveAuthUserId(c);
    const requestedAction = body.action;
    if (existingUserId && requestedAction && isStepUpAction(requestedAction)) {
      await grantStepUp(existingUserId, requestedAction).catch(() => null);
      // Step-up flows just return the Better Auth response (no new tokens needed)
      return new Response(responseText, {
        status: response.status,
        headers: copyHeadersWithSetCookie(response.headers),
      });
    }

    return new Response(responseText, {
      status: response.status,
      headers: copyHeadersWithSetCookie(response.headers),
    });
  } catch {
    return c.json({ error: 'passkey_authentication_failed' }, 401);
  }
});

authRoutes.post('/device/code', zValidator('json', deviceCodeSchema), async (c) => {
  const payload = c.req.valid('json');
  const deviceCodeRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'device-code',
    identifier: `${getClientIp(c)}:${payload.client_id}`,
    windowSec: AUTH_DEVICE_CODE_LIMIT_WINDOW_SECONDS,
    max: AUTH_DEVICE_CODE_LIMIT_MAX,
  });
  if (deviceCodeRateLimit) {
    return deviceCodeRateLimit;
  }

  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/device/code',
      method: 'POST',
      body: payload as Record<string, unknown>,
    });
    const body = await response.json();
    return c.json(body as Record<string, unknown>, response.status as 200 | 400 | 401);
  } catch {
    return c.json({ error: 'device_code_failed' }, 400);
  }
});

authRoutes.get('/device', zValidator('query', deviceVerifySchema), async (c) => {
  try {
    return await forwardBetterAuthPluginResponse({
      request: c.req.raw,
      path: '/device',
      method: 'GET',
      preserveQuery: true,
    });
  } catch {
    return c.json({ error: 'device_verify_failed' }, 400);
  }
});

authRoutes.post('/device/approve', zValidator('json', deviceApproveSchema), async (c) => {
  try {
    const payload = c.req.valid('json');
    return await forwardBetterAuthPluginResponse({
      request: c.req.raw,
      path: '/device/approve',
      method: 'POST',
      body: payload as Record<string, unknown>,
    });
  } catch {
    return c.json({ error: 'device_approve_failed' }, 400);
  }
});

authRoutes.post('/device/token', zValidator('json', deviceTokenSchema), async (c) => {
  const payload = c.req.valid('json');
  const deviceTokenRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'device-token',
    identifier: `${getClientIp(c)}:${payload.client_id}:${payload.device_code.slice(0, 16)}`,
    windowSec: AUTH_DEVICE_TOKEN_LIMIT_WINDOW_SECONDS,
    max: AUTH_DEVICE_TOKEN_LIMIT_MAX,
  });
  if (deviceTokenRateLimit) {
    return deviceTokenRateLimit;
  }

  try {
    return await forwardBetterAuthPluginResponse({
      request: c.req.raw,
      path: '/device/token',
      method: 'POST',
      body: payload as Record<string, unknown>,
    });
  } catch {
    return c.json({ error: 'device_token_failed' }, 400);
  }
});

/**
 * Mock Auth Endpoints
 * These endpoints are for local development with VITE_USE_MOCK_AUTH=true
 * They simulate the Apple Auth flow without requiring real Apple credentials
 */

// Check if mock auth is enabled
function isMockAuthEnabled(): boolean {
  return process.env.VITE_USE_MOCK_AUTH === 'true';
}

// Import mock auth types and provider
import { createMockAuthProvider } from '@hominem/auth/server-auth';

/**
 * POST /auth/mock/signin
 * Mock sign-in endpoint for local development
 * Returns a mock user and session token
 */
authRoutes.post('/mock/signin', async (c) => {
  if (!isMockAuthEnabled()) {
    return c.json({ error: 'Mock auth is not enabled' }, 400);
  }

  try {
    const provider = createMockAuthProvider();
    const response = await provider.signIn();

    return c.json(
      {
        user: response.user,
        session: response.session,
      },
      200,
    );
  } catch (err) {
    logger.error('Mock signin error:', err instanceof Error ? err : new Error(String(err)));
    return c.json({ error: 'Mock signin failed' }, 500);
  }
});

/**
 * GET /auth/mock/session
 * Get the current mock session (for testing session persistence)
 */
authRoutes.get('/mock/session', async (c) => {
  if (!isMockAuthEnabled()) {
    return c.json({ error: 'Mock auth is not enabled' }, 400);
  }

  try {
    // In a real implementation, we'd validate the session token
    // For mock auth, we just check if the request has valid format
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ session: null }, 200);
    }

    // Mock implementation: just return success
    // The client should handle session validation via the token
    return c.json({ session: { valid: true } }, 200);
  } catch (err) {
    logger.error('Mock session error:', err instanceof Error ? err : new Error(String(err)));
    return c.json({ error: 'Mock session check failed' }, 500);
  }
});

/**
 * POST /auth/mock/signout
 * Mock sign-out endpoint
 */
authRoutes.post('/mock/signout', async (c) => {
  if (!isMockAuthEnabled()) {
    return c.json({ error: 'Mock auth is not enabled' }, 400);
  }

  try {
    const provider = createMockAuthProvider();
    await provider.signOut();

    return c.json({ success: true }, 200);
  } catch (err) {
    logger.error('Mock signout error:', err instanceof Error ? err : new Error(String(err)));
    return c.json({ error: 'Mock signout failed' }, 500);
  }
});
