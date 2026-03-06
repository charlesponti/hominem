import { createHash, randomBytes } from 'node:crypto';

import { users } from '@hominem/db/all-schema';
import { db, eq } from '@hominem/hono-rpc';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer } from '../auth/better-auth';
import { getJwks } from '../auth/key-store';
import { UserAuthService } from '@hominem/auth/server';
import {
  createTokenPairForUser,
  revokeByRefreshToken,
  revokeSession,
  rotateRefreshToken,
} from '../auth/session-store';
import { getLatestTestOtp, isTestOtpStoreEnabled } from '../auth/test-otp-store';
import { issueAccessToken, verifyAccessToken } from '../auth/tokens';
import { env } from '../env';
import type { AppEnv } from '../server';

export const authRoutes = new Hono<AppEnv>();

const devIssueTokenSchema = z.object({
  userId: z.string().uuid(),
  scope: z.array(z.string()).optional(),
  role: z.enum(['user', 'admin']).optional(),
  sid: z.string().uuid().optional(),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(16),
});

const revokeTokenSchema = z.object({
  token: z.string().min(16),
  token_type_hint: z.enum(['refresh_token', 'access_token']).optional(),
});

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
  type: z.enum(['sign-in', 'change-email', 'email-verification', 'forget-password']).default('sign-in'),
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

const mobileE2eLoginSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(128).optional(),
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
}

function getHeaderCarrier(c: { req: { raw: Request } }) {
  return {
    headers: c.req.raw.headers,
  };
}

function isE2eAuthEnabled() {
  return env.AUTH_E2E_ENABLED && env.NODE_ENV !== 'production';
}

function isTestOtpRetrievalEnabled() {
  return isTestOtpStoreEnabled();
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

const STEP_UP_TTL_SECONDS = 5 * 60;

function getStepUpKey(userId: string, action: string) {
  return `auth:stepup:${userId}:${action}`;
}

async function grantStepUp(userId: string, action: string) {
  const { redis } = await import('@hominem/services/redis');
  await redis.set(getStepUpKey(userId, action), '1', 'EX', STEP_UP_TTL_SECONDS);
}

function copyHeadersWithSetCookie(headers: Headers) {
  const copied = new Headers(headers);
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];

  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) {
      copied.append('set-cookie', setCookie);
    }
  }

  return copied;
}

function buildBetterAuthUrl(input: {
  request: Request;
  path?: string | undefined;
  preserveQuery?: boolean | undefined;
}) {
  const requestUrl = new URL(input.request.url);
  const targetPath = input.path ? `/api/auth${input.path}` : requestUrl.pathname;
  const targetUrl = new URL(targetPath, env.BETTER_AUTH_URL);

  if (input.preserveQuery) {
    targetUrl.search = requestUrl.search;
  }

  return targetUrl;
}

async function callBetterAuthPluginEndpoint(input: {
  request: Request;
  path: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown> | undefined;
}) {
  const url = buildBetterAuthUrl({
    request: input.request,
    path: input.path,
  });
  logger.debug('[auth:plugin] forwarding Better Auth endpoint', {
    method: input.method,
    targetUrl: url.toString(),
  });
  const headers = new Headers(input.request.headers);
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

authRoutes.get('/jwks', async (c) => {
  return c.json(await getJwks());
});

authRoutes.post('/mobile/e2e/login', zValidator('json', mobileE2eLoginSchema), async (c) => {
  const clientIp = getClientIp(c);

  if (!isE2eAuthEnabled()) {
    logger.warn('[auth:e2e:mobile] denied because E2E auth is disabled', {
      clientIp,
      nodeEnv: env.NODE_ENV,
    });
    return c.json({ error: 'not_found' }, 404);
  }

  const providedSecret = c.req.header('x-e2e-auth-secret');
  if (!providedSecret || !env.AUTH_E2E_SECRET || providedSecret !== env.AUTH_E2E_SECRET) {
    logger.warn('[auth:e2e:mobile] denied because secret header is invalid', {
      clientIp,
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
  const emailHash = createHash('sha256').update(email).digest('hex').slice(0, 16);

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user =
    existingUser ??
    (
      await db
        .insert(users)
        .values({
          email,
          name,
          isAdmin: false,
        })
        .returning()
    )[0];

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
    role: user.isAdmin ? 'admin' : 'user',
    amr: ['e2e', 'mobile'],
  });
  const refreshToken = randomBytes(32).toString('base64url');
  const sessionId = crypto.randomUUID();
  const refreshFamilyId = crypto.randomUUID();

  logger.info('[auth:e2e:mobile] issued token pair', {
    clientIp,
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
  };

  return c.json(response);
});

authRoutes.post('/email-otp/send', zValidator('json', emailOtpRequestSchema), async (c) => {
  try {
    const payload = c.req.valid('json');
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/email-otp/send-verification-otp',
      method: 'POST',
      body: payload as Record<string, unknown>,
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
      const parsed = JSON.parse(body) as { user?: { id?: string; email?: string; name?: string } };
      const userId = parsed.user?.id;
      
      if (!userId) {
        return c.json({ error: 'user_id_missing' }, 400);
      }

      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!dbUser) {
        return c.json({ error: 'user_not_found' }, 400);
      }

      // Issue token pair with full session tracking
      try {
        const tokenPair = await createTokenPairForUser({
          userId,
          role: dbUser.isAdmin ? 'admin' : 'user',
          amr: ['email_otp'],
        });

        return c.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            ...(dbUser.name ? { name: dbUser.name } : {}),
          },
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          tokenType: tokenPair.tokenType,
        });
      } catch (sessionError) {
        // Fallback: If session table is not available, issue access token only
        logger.warn('[auth:email-otp] session creation failed, issuing access token only', { sessionError });
        
        const token = await issueAccessToken({
          sub: userId,
          sid: crypto.randomUUID(),
          scope: ['api:read', 'api:write'],
          role: dbUser.isAdmin ? 'admin' : 'user',
          amr: ['email_otp'],
        });

        return c.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            ...(dbUser.name ? { name: dbUser.name } : {}),
          },
          accessToken: token.accessToken,
          refreshToken: '',  // Empty string indicates no refresh capability in this mode
          expiresIn: token.expiresIn,
          tokenType: token.tokenType,
        });
      }
    } catch (error) {
      logger.error('[auth:email-otp] sign-in failed', { error });
      return c.json({ error: 'sign_in_failed' }, 500);
    }
  } catch {
    return c.json({ error: 'email_otp_verify_failed' }, 400);
  }
});

authRoutes.post('/sign-in/email-otp', zValidator('json', emailOtpVerifySchema), async (c) => {
  try {
    const payload = c.req.valid('json');
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
      const parsed = JSON.parse(body) as { user?: { id?: string; email?: string; name?: string } };
      const userId = parsed.user?.id;
      
      if (!userId) {
        return c.json({ error: 'user_id_missing' }, 400);
      }

      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      
      if (!dbUser) {
        return c.json({ error: 'user_not_found' }, 400);
      }

      // Issue token pair with full session tracking
      try {
        const tokenPair = await createTokenPairForUser({
          userId,
          role: dbUser.isAdmin ? 'admin' : 'user',
          amr: ['email_otp'],
        });

        return c.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            ...(dbUser.name ? { name: dbUser.name } : {}),
          },
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresIn: tokenPair.expiresIn,
          tokenType: tokenPair.tokenType,
        });
      } catch (sessionError) {
        // Fallback: If session table is not available, issue access token only
        logger.warn('[auth:sign-in:email-otp] session creation failed, issuing access token only', { sessionError });
        
        const token = await issueAccessToken({
          sub: userId,
          sid: crypto.randomUUID(),
          scope: ['api:read', 'api:write'],
          role: dbUser.isAdmin ? 'admin' : 'user',
          amr: ['email_otp'],
        });

        return c.json({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            ...(dbUser.name ? { name: dbUser.name } : {}),
          },
          accessToken: token.accessToken,
          refreshToken: '',  // Empty string indicates no refresh capability in this mode
          expiresIn: token.expiresIn,
          tokenType: token.tokenType,
        });
      }
    } catch (error) {
      logger.error('[auth:sign-in:email-otp] sign-in failed', { error });
      return c.json({ error: 'sign_in_failed' }, 500);
    }
  } catch {
    return c.json({ error: 'email_otp_verify_failed' }, 400);
  }
});

authRoutes.get('/get-session', async (c) => {
  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/get-session',
      method: 'GET',
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
  } catch {
    return c.json({ error: 'session_fetch_failed' }, 400);
  }
});

authRoutes.post('/sign-out', async (c) => {
  try {
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/sign-out',
      method: 'POST',
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: new Headers(response.headers),
    });
  } catch {
    return c.json({ error: 'sign_out_failed' }, 400);
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
  const auth = c.get('auth');
  if (auth?.sid) {
    await revokeSession(auth.sid);
  }
  await betterAuthServer.api.signOut({
    ...getHeaderCarrier(c),
  });
  return c.json({ success: true });
});

authRoutes.get('/session', async (c) => {
  // PHASE 1: Identity-only endpoint
  // Accepts Bearer token via middleware validation
  // Returns user identity information ONLY - no token minting
  
  const auth = c.get('auth');
  
  if (!auth) {
    return c.json({
      isAuthenticated: false,
      user: null,
    }, 401);
  }
  
  // User must exist in DB
  const userRecord = await UserAuthService.findByIdOrEmail({
    id: auth.sub,
  });
  
  if (!userRecord) {
    return c.json({
      isAuthenticated: false,
      user: null,
    }, 401);
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
  });
});

authRoutes.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  // Clean refresh endpoint matching the single-path architecture spec
  // POST /api/auth/refresh
  // Input: { refreshToken }
  // Output: { accessToken, refreshToken, expiresIn }
  
  const { refresh_token: refreshToken } = c.req.valid('json');
  
  const refreshRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'refresh-token-standard',
    identifier: `${getClientIp(c)}:${refreshToken.slice(0, 16)}`,
    windowSec: AUTH_REFRESH_LIMIT_WINDOW_SECONDS,
    max: AUTH_REFRESH_LIMIT_MAX,
  });
  if (refreshRateLimit) {
    return refreshRateLimit;
  }

  const rotated = await rotateRefreshToken(refreshToken);
  
  if (!rotated.ok) {
    logger.warn('[auth:refresh] token rotation failed', {
      error: rotated.error,
      clientIp: getClientIp(c),
    });
    return c.json(
      {
        error: rotated.error,
        message: rotated.error === 'expired_refresh_token' 
          ? 'Refresh token expired. Please sign in again.'
          : 'Invalid or revoked refresh token. Please sign in again.',
      },
      401,
    );
  }

  return c.json({
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    expiresIn: rotated.expiresIn,
    tokenType: rotated.tokenType,
  });
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
  if (!parsed.success) {
    return c.json({ error: 'invalid_request', message: parsed.error.message }, 400);
  }

  const tokenRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'refresh-token',
    identifier: `${getClientIp(c)}:${parsed.data.refresh_token.slice(0, 16)}`,
    windowSec: AUTH_REFRESH_LIMIT_WINDOW_SECONDS,
    max: AUTH_REFRESH_LIMIT_MAX,
  });
  if (tokenRateLimit) {
    return tokenRateLimit;
  }

  const rotated = await rotateRefreshToken(parsed.data.refresh_token);
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

authRoutes.post('/refresh-token', zValidator('json', refreshTokenSchema), async (c) => {
  const refreshToken = c.req.valid('json').refresh_token;
  const refreshTokenRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'refresh-token-legacy',
    identifier: `${getClientIp(c)}:${refreshToken.slice(0, 16)}`,
    windowSec: AUTH_REFRESH_LIMIT_WINDOW_SECONDS,
    max: AUTH_REFRESH_LIMIT_MAX,
  });
  if (refreshTokenRateLimit) {
    return refreshTokenRateLimit;
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

authRoutes.post('/revoke', zValidator('json', revokeTokenSchema), async (c) => {
  const { token, token_type_hint: tokenTypeHint } = c.req.valid('json');
  if (tokenTypeHint && tokenTypeHint !== 'refresh_token') {
    return c.json({ revoked: false, error: 'unsupported_token_type' }, 400);
  }

  const revoked = await revokeByRefreshToken(token);
  return c.json({ revoked });
});

authRoutes.post('/passkey/register/options', async (c) => {
  if (!c.get('userId')) {
    return c.json({ error: 'unauthorized' }, 401);
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
    if (!c.get('userId')) {
      return c.json({ error: 'unauthorized' }, 401);
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
    const userId = c.get('userId');
    const requestedAction = body.action;
    if (response.status >= 200 && response.status < 300 && userId && requestedAction) {
      await grantStepUp(userId, requestedAction).catch(() => null);
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
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/device/token',
      method: 'POST',
      body: payload as Record<string, unknown>,
    });
    const body = await response.json();
    return c.json(body as Record<string, unknown>, response.status as 200 | 400 | 401);
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
import { createMockAuthProvider, type User, type Session } from '@hominem/auth/server-auth';

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
