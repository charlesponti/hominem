import { createHash } from 'node:crypto';

import type { User } from '@hominem/auth/server';
import {
  UserAuthService,
  configureStepUpStore,
  grantStepUp,
  hasRecentStepUp,
} from '@hominem/auth/server';
import type { StepUpAction } from '@hominem/auth/step-up-actions';
import { STEP_UP_ACTIONS, isStepUpAction } from '@hominem/auth/step-up-actions';
import { db } from '@hominem/db';
import { redis } from '@hominem/services/redis';
import { getSetCookieHeaders } from '@hominem/utils/headers';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer } from '../auth/better-auth';
import { getLatestTestOtp, isTestOtpStoreEnabled } from '../auth/test-otp-store';
import { env } from '../env';
import type { AppEnv } from '../server';

export const authRoutes = new Hono<AppEnv>();

configureStepUpStore(redis);

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

const testOtpQuerySchema = z.object({
  email: z.string().email(),
  type: z.string().min(1).optional(),
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

const AUTH_DEVICE_CODE_LIMIT_WINDOW_SECONDS = 10 * 60;
const AUTH_DEVICE_CODE_LIMIT_MAX = 10;
const AUTH_DEVICE_TOKEN_LIMIT_WINDOW_SECONDS = 10 * 60;
const AUTH_DEVICE_TOKEN_LIMIT_MAX = 120;

interface AuthRateLimitInput {
  bucket: string;
  identifier: string;
  windowSec: number;
  max: number;
}

interface BetterAuthSessionContext {
  sessionId: string;
  userId: string;
}

interface AppSessionResponse {
  isAuthenticated: boolean;
  user: User | null;
  auth?: {
    sub: string;
    sid: string;
    amr: string[];
    authTime: number;
  } | null;
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

async function resolveAuthUserId(c: {
  get: (key: string) => string | null | undefined;
  req: { raw: Request };
}): Promise<string | null> {
  const fromMiddleware = c.get('userId');
  if (fromMiddleware) {
    return fromMiddleware;
  }

  const betterAuthSession = await getBetterAuthSessionContext(c as Context<AppEnv>);
  return betterAuthSession?.userId ?? null;
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
  amr: string[];
}): Promise<AppSessionResponse | null> {
  const user = await UserAuthService.findByIdOrEmail({ id: input.userId });
  if (!user) {
    return null;
  }

  return {
    isAuthenticated: true,
    user,
    auth: {
      sub: user.id,
      sid: input.sessionId,
      amr: input.amr,
      authTime: Math.floor(Date.now() / 1000),
    },
  };
}

async function getRedis() {
  const { redis: redisClient } = await import('@hominem/services/redis');
  return redisClient;
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
    const redisClient = await getRedis();
    const key = `ratelimit:auth:${input.bucket}:${hashRateLimitIdentifier(input.identifier)}`;
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, input.windowSec);
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

async function userHasRegisteredPasskeys(userId: string) {
  const existingPasskey = await db
    .selectFrom('passkey')
    .select('id')
    .where('userId', '=', userId)
    .limit(1)
    .executeTakeFirst();

  return Boolean(existingPasskey);
}

async function hasSatisfiedStepUp(userId: string, action: StepUpAction) {
  return hasRecentStepUp(userId, action);
}

async function requiresPasskeyRegisterStepUp(userId: string) {
  if (!(await userHasRegisteredPasskeys(userId))) {
    return false;
  }

  return !(await hasSatisfiedStepUp(userId, STEP_UP_ACTIONS.PASSKEY_REGISTER));
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
  return new Response(await response.text(), {
    status: response.status,
    headers: copyHeadersWithSetCookie(response.headers),
  });
}

async function forwardBetterAuthDeviceTokenResponse(input: {
  request: Request;
  body: Record<string, unknown>;
}) {
  const response = await callBetterAuthPluginEndpoint({
    request: input.request,
    path: '/device/token',
    method: 'POST',
    body: input.body,
  });

  const responseText = await response.text();
  const headers = copyHeadersWithSetCookie(response.headers);

  if (!headers.has('set-auth-token')) {
    try {
      const payload = JSON.parse(responseText) as { access_token?: string };
      if (typeof payload.access_token === 'string' && payload.access_token.length > 0) {
        headers.set('set-auth-token', payload.access_token);
      }
    } catch {
      // Preserve the upstream response when the token payload is not JSON.
    }
  }

  return new Response(responseText, {
    status: response.status,
    headers,
  });
}

authRoutes.post('/email-otp/send', zValidator('json', emailOtpRequestSchema), async (c) => {
  try {
    const payload = c.req.valid('json');
    const response = await callBetterAuthPluginEndpoint({
      request: c.req.raw,
      path: '/email-otp/send-verification-otp',
      method: 'POST',
      body: {
        ...payload,
        email: normalizeAuthEmail(payload.email),
      },
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: copyHeadersWithSetCookie(response.headers),
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
      body: {
        ...payload,
        email: normalizeAuthEmail(payload.email),
        otp: normalizeOtpCode(payload.otp),
      },
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: copyHeadersWithSetCookie(response.headers),
    });
  } catch {
    return c.json({ error: 'email_otp_verify_failed' }, 400);
  }
});

authRoutes.get('/test/otp/latest', zValidator('query', testOtpQuerySchema), async (c) => {
  if (!isTestOtpStoreEnabled()) {
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
  const response = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/sign-out',
    method: 'POST',
  }).catch(() => null);

  const headers = response ? copyHeadersWithSetCookie(response.headers) : new Headers();
  return jsonWithHeaders({ success: true }, 200, headers);
});

authRoutes.get('/session', async (c) => {
  try {
    const betterAuthSession = await getBetterAuthSessionContext(c);
    if (!betterAuthSession) {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }

    const sessionResponse = await buildSessionResponse({
      sessionId: betterAuthSession.sessionId,
      userId: betterAuthSession.userId,
      amr: ['better-auth-session'],
    });

    if (!sessionResponse) {
      return c.json({ isAuthenticated: false, user: null }, 401);
    }

    return c.json(sessionResponse);
  } catch {
    return c.json({ isAuthenticated: false, user: null }, 401);
  }
});

authRoutes.post('/passkey/register/options', async (c) => {
  const userId = await resolveAuthUserId(c);
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  if (await requiresPasskeyRegisterStepUp(userId)) {
    return c.json({ error: 'step_up_required', action: STEP_UP_ACTIONS.PASSKEY_REGISTER }, 403);
  }

  try {
    return await forwardBetterAuthPluginResponse({
      request: c.req.raw,
      path: '/passkey/generate-register-options',
      method: 'GET',
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

    if (await requiresPasskeyRegisterStepUp(userId)) {
      return c.json({ error: 'step_up_required', action: STEP_UP_ACTIONS.PASSKEY_REGISTER }, 403);
    }

    try {
      return await forwardBetterAuthPluginResponse({
        request: c.req.raw,
        path: '/passkey/verify-registration',
        method: 'POST',
        body: c.req.valid('json') as Record<string, unknown>,
      });
    } catch {
      return c.json({ error: 'passkey_registration_failed' }, 400);
    }
  },
);

authRoutes.get('/passkeys', async (c) => {
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
    return c.json((await response.json()) as Record<string, unknown>, response.status as 200 | 400 | 401);
  } catch {
    return c.json({ error: 'passkey_list_failed' }, 400);
  }
});

authRoutes.delete(
  '/passkey/delete',
  zValidator('json', z.object({ id: z.string() })),
  async (c) => {
    const userId = await resolveAuthUserId(c);
    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401);
    }

    if (!(await hasSatisfiedStepUp(userId, STEP_UP_ACTIONS.PASSKEY_DELETE))) {
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
      return c.json((await response.json()) as Record<string, unknown>, response.status as 200 | 400 | 401);
    } catch {
      return c.json({ error: 'passkey_delete_failed' }, 400);
    }
  },
);

authRoutes.post('/passkey/auth/options', async (c) => {
  try {
    return await forwardBetterAuthPluginResponse({
      request: c.req.raw,
      path: '/passkey/generate-authenticate-options',
      method: 'GET',
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

    const existingUserId = await resolveAuthUserId(c);
    const requestedAction = body.action;
    if (existingUserId && requestedAction && isStepUpAction(requestedAction)) {
      await grantStepUp(existingUserId, requestedAction).catch(() => null);
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
    return c.json((await response.json()) as Record<string, unknown>, response.status as 200 | 400 | 401);
  } catch {
    return c.json({ error: 'deviceCode_failed' }, 400);
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
    return await forwardBetterAuthDeviceTokenResponse({
      request: c.req.raw,
      body: payload as Record<string, unknown>,
    });
  } catch {
    return c.json({ error: 'device_token_failed' }, 400);
  }
});
