import type { Context } from 'hono';

import { and, db, eq, isNull } from '@hominem/db';
import { authSubjects } from '@hominem/db/schema/auth';
import { users } from '@hominem/db/schema/users';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { AppEnv } from '../server';

import { betterAuthServer } from '../auth/better-auth';
import { getJwks } from '../auth/key-store';
import {
  createE2eTokenPairForUser,
  createTokenPairForUser,
  revokeByRefreshToken,
  revokeSession,
  rotateRefreshToken,
} from '../auth/session-store';
import { ensureOAuthSubjectUser } from '../auth/subjects';
import { issueAccessToken, verifyAccessToken } from '../auth/tokens';
import { env } from '../env';

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

const deviceCodeSchema = z.object({
  client_id: z.string().min(1),
  scope: z.string().optional(),
});

const deviceTokenSchema = z.object({
  grant_type: z.literal('urn:ietf:params:oauth:grant-type:device_code'),
  device_code: z.string().min(1),
  client_id: z.string().min(1),
});

const mobileAuthorizeSchema = z.object({
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43).max(128),
  state: z.string().min(8).max(256),
});

const mobileExchangeSchema = z.object({
  code: z.string().min(16),
  code_verifier: z.string().min(43).max(128),
  redirect_uri: z.string().url(),
});

const mobileE2eLoginSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(128).optional(),
});

const cliAuthorizeSchema = z.object({
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(43).max(128),
  state: z.string().min(8).max(256),
  scope: z.string().optional(),
});

const cliExchangeSchema = z.object({
  code: z.string().min(16),
  code_verifier: z.string().min(43).max(128),
  redirect_uri: z.string().url(),
});

const MOBILE_FLOW_PREFIX = 'auth:mobile:flow:';
const MOBILE_EXCHANGE_PREFIX = 'auth:mobile:exchange:';
const MOBILE_ALLOWED_REDIRECT_URI_PREFIXES = [
  'hakumi://auth/callback',
  'mindsherpa://auth/callback',
  'com.pontistudios.mindsherpa.dev://auth/callback',
];
const MOBILE_FLOW_TTL_SECONDS = 10 * 60;
const MOBILE_EXCHANGE_TTL_SECONDS = 2 * 60;
const CLI_FLOW_PREFIX = 'auth:cli:flow:';
const CLI_EXCHANGE_PREFIX = 'auth:cli:exchange:';
const CLI_FLOW_TTL_SECONDS = 10 * 60;
const CLI_EXCHANGE_TTL_SECONDS = 2 * 60;
const CLI_ALLOWED_SCOPE_SET = new Set(['cli:read', 'cli:write']);
const CLI_DEFAULT_SCOPES = ['cli:read'];
const AUTH_AUTHORIZE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_AUTHORIZE_LIMIT_MAX = 30;
const AUTH_MOBILE_AUTHORIZE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_MOBILE_AUTHORIZE_LIMIT_MAX = 20;
const AUTH_CLI_AUTHORIZE_LIMIT_WINDOW_SECONDS = 60;
const AUTH_CLI_AUTHORIZE_LIMIT_MAX = 20;
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

interface MobileFlowPayload {
  redirectUri: string;
  codeChallenge: string;
  state: string;
}

interface MobileExchangePayload {
  redirectUri: string;
  codeChallenge: string;
  state: string;
  token: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    sessionId: string;
    refreshFamilyId: string;
  };
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

interface CliFlowPayload {
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scope: string[];
}

interface CliExchangePayload {
  redirectUri: string;
  codeChallenge: string;
  state: string;
  scope: string[];
  token: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    sessionId: string;
    refreshFamilyId: string;
  };
}

function getHeaderCarrier(c: { req: { raw: Request } }) {
  return {
    headers: c.req.raw.headers,
  };
}

function createOpaqueCode(size = 32) {
  return randomBytes(size).toString('base64url');
}

function hashPkceVerifier(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

function getMobileFlowKey(flowId: string) {
  return `${MOBILE_FLOW_PREFIX}${flowId}`;
}

function getMobileExchangeKey(code: string) {
  return `${MOBILE_EXCHANGE_PREFIX}${code}`;
}

function getCliFlowKey(flowId: string) {
  return `${CLI_FLOW_PREFIX}${flowId}`;
}

function getCliExchangeKey(code: string) {
  return `${CLI_EXCHANGE_PREFIX}${code}`;
}

function isAllowedMobileRedirectUri(redirectUri: string) {
  return MOBILE_ALLOWED_REDIRECT_URI_PREFIXES.some((prefix) => redirectUri.startsWith(prefix));
}

function isAllowedCliRedirectUri(redirectUri: string) {
  try {
    const url = new URL(redirectUri);
    if (url.protocol !== 'http:') {
      return false;
    }
    if (!(url.hostname === '127.0.0.1' || url.hostname === 'localhost')) {
      return false;
    }
    if (!url.port) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const TRUSTED_WEB_REDIRECT_ORIGINS = new Set(
  [env.BETTER_AUTH_URL, env.FINANCE_URL, env.NOTES_URL, env.ROCCO_URL].map(
    (url) => new URL(url).origin,
  ),
);

function isAllowedWebRedirectUri(redirectUri: string) {
  try {
    return TRUSTED_WEB_REDIRECT_ORIGINS.has(new URL(redirectUri).origin);
  } catch {
    return false;
  }
}

function parseCliScopes(scope: string | undefined) {
  if (!scope || !scope.trim()) {
    return CLI_DEFAULT_SCOPES;
  }

  const requested = scope
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const filtered = requested.filter((token) => CLI_ALLOWED_SCOPE_SET.has(token));
  if (filtered.length === 0) {
    return CLI_DEFAULT_SCOPES;
  }
  return [...new Set(filtered)];
}

function isE2eAuthEnabled() {
  return env.AUTH_E2E_ENABLED && env.NODE_ENV !== 'production';
}

function appendQueryParams(baseUrl: string, params: Record<string, string>) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
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

async function consumeStepUp(userId: string, action: string) {
  const { redis } = await import('@hominem/services/redis');
  const key = getStepUpKey(userId, action);
  const granted = await redis.get(key);
  if (granted !== '1') {
    return false;
  }
  await redis.del(key);
  return true;
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

function normalizeRedirectResponse(response: Response) {
  const location = response.headers.get('location');
  if (!location) {
    return response;
  }

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const headers = copyHeadersWithSetCookie(response.headers);
  headers.set('location', location);
  headers.delete('content-type');
  headers.delete('content-length');

  return new Response(null, {
    status: 302,
    headers,
  });
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
  logger.debug('[auth:oauth] forwarding Better Auth plugin endpoint', {
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

async function proxyBetterAuthRequest(input: { request: Request }) {
  const url = buildBetterAuthUrl({
    request: input.request,
    preserveQuery: true,
  });
  logger.debug('[auth:oauth] proxying Better Auth request', {
    method: input.request.method,
    targetUrl: url.toString(),
  });
  return betterAuthServer.handler(new Request(url.toString(), input.request));
}

authRoutes.get('/jwks', async (c) => {
  return c.json(await getJwks());
});

async function handleProviderCallback(c: Context<AppEnv>, provider: 'apple' | 'google') {
  const callbackUrl = new URL(c.req.url);
  logger.info('[auth:oauth] received provider callback', {
    provider,
    method: c.req.method,
    hasCode: callbackUrl.searchParams.has('code'),
    hasState: callbackUrl.searchParams.has('state'),
    hasError: callbackUrl.searchParams.has('error'),
  });

  return proxyBetterAuthRequest({
    request: c.req.raw,
  });
}

authRoutes.get('/callback/apple', async (c) => handleProviderCallback(c, 'apple'));
authRoutes.post('/callback/apple', async (c) => handleProviderCallback(c, 'apple'));
authRoutes.get('/callback/google', async (c) => handleProviderCallback(c, 'google'));
authRoutes.post('/callback/google', async (c) => handleProviderCallback(c, 'google'));

authRoutes.get('/authorize', async (c) => {
  const authorizeRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'authorize',
    identifier: getClientIp(c),
    windowSec: AUTH_AUTHORIZE_LIMIT_WINDOW_SECONDS,
    max: AUTH_AUTHORIZE_LIMIT_MAX,
  });
  if (authorizeRateLimit) {
    return authorizeRateLimit;
  }

  const providerParam = c.req.query('provider');
  if (providerParam && providerParam !== 'apple') {
    return c.json(
      {
        error: 'provider_not_allowed',
        message:
          'Primary sign-in only supports Apple. Use /api/auth/link/google/start after login.',
      },
      400,
    );
  }

  const redirectUri = c.req.query('redirect_uri') ?? `${new URL(c.req.url).origin}/`;
  const clientIp = getClientIp(c);

  logger.info('[auth:oauth] handling authorize request', {
    clientIp,
    redirectUri,
  });

  const response = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/sign-in/social',
    method: 'POST',
    body: {
      provider: 'apple',
      callbackURL: redirectUri,
      disableRedirect: false,
    },
  });

  const normalized = normalizeRedirectResponse(response);
  logger.info('[auth:oauth] completed authorize request', {
    clientIp,
    status: normalized.status,
    hasLocation: Boolean(normalized.headers.get('location')),
  });

  return normalized;
});

authRoutes.post('/mobile/authorize', zValidator('json', mobileAuthorizeSchema), async (c) => {
  const mobileAuthorizeRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'mobile-authorize',
    identifier: getClientIp(c),
    windowSec: AUTH_MOBILE_AUTHORIZE_LIMIT_WINDOW_SECONDS,
    max: AUTH_MOBILE_AUTHORIZE_LIMIT_MAX,
  });
  if (mobileAuthorizeRateLimit) {
    return mobileAuthorizeRateLimit;
  }

  const { redirect_uri: redirectUri, code_challenge: codeChallenge, state } = c.req.valid('json');
  const clientIp = getClientIp(c);

  if (!isAllowedMobileRedirectUri(redirectUri)) {
    logger.warn('[auth:mobile] rejected authorize request due to redirect URI allowlist mismatch', {
      clientIp,
      redirectUri,
    });
    return c.json(
      {
        error: 'invalid_redirect_uri',
        message: 'Mobile redirect URI is not on the allowlist.',
      },
      400,
    );
  }

  const flowId = createOpaqueCode(24);
  const callbackUrl = new URL('/api/auth/mobile/callback', env.BETTER_AUTH_URL);
  callbackUrl.searchParams.set('flow_id', flowId);

  try {
    const redis = await getRedis();
    const payload: MobileFlowPayload = {
      redirectUri,
      codeChallenge,
      state,
    };
    await redis.set(
      getMobileFlowKey(flowId),
      JSON.stringify(payload),
      'EX',
      MOBILE_FLOW_TTL_SECONDS,
    );
  } catch (error) {
    logger.error('[auth:mobile] failed to persist mobile authorize flow', {
      clientIp,
      flowId,
      redirectUri,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.json({ error: 'flow_unavailable' }, 503);
  }

  const startUrl = new URL('/api/auth/authorize', env.BETTER_AUTH_URL);
  startUrl.searchParams.set('provider', 'apple');
  startUrl.searchParams.set('redirect_uri', callbackUrl.toString());

  logger.info('[auth:mobile] created mobile authorize flow', {
    clientIp,
    flowId,
  });

  return c.json({
    authorization_url: startUrl.toString(),
    flow_id: flowId,
  });
});

authRoutes.get('/mobile/callback', async (c) => {
  const flowId = c.req.query('flow_id');
  const clientIp = getClientIp(c);
  if (!flowId) {
    logger.warn('[auth:mobile] callback missing flow ID', {
      clientIp,
    });
    return c.text('Missing flow id', 400);
  }

  let flow: MobileFlowPayload | null = null;
  try {
    const redis = await getRedis();
    const rawFlow = await redis.get(getMobileFlowKey(flowId));
    if (!rawFlow) {
      logger.warn('[auth:mobile] callback flow is invalid or expired', {
        clientIp,
        flowId,
      });
      return c.text('Authorization flow expired', 400);
    }
    await redis.del(getMobileFlowKey(flowId));
    flow = z
      .object({
        redirectUri: z.string().url(),
        codeChallenge: z.string().min(43).max(128),
        state: z.string().min(8).max(256),
      })
      .parse(JSON.parse(rawFlow));
  } catch (error) {
    logger.error('[auth:mobile] failed to resume callback flow', {
      clientIp,
      flowId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.text('Failed to resume authorization flow', 503);
  }

  if (!flow || !isAllowedMobileRedirectUri(flow.redirectUri)) {
    logger.warn('[auth:mobile] callback payload failed validation', {
      clientIp,
      flowId,
      redirectUri: flow?.redirectUri ?? null,
    });
    return c.text('Invalid mobile flow payload', 400);
  }

  const errorParam = c.req.query('error');
  if (errorParam) {
    const errorDescription = c.req.query('error_description') ?? 'Apple sign-in failed';
    logger.warn('[auth:mobile] provider callback returned OAuth error', {
      clientIp,
      flowId,
      error: errorParam,
      errorDescription,
    });
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: errorParam,
        error_description: errorDescription,
        state: flow.state,
      }),
    );
  }

  const session = await betterAuthServer.api.getSession({
    ...getHeaderCarrier(c),
  });

  if (!session?.user) {
    logger.warn('[auth:mobile] callback could not establish authenticated session', {
      clientIp,
      flowId,
    });
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'session_not_found',
        error_description: 'Unable to establish authenticated session after callback.',
        state: flow.state,
      }),
    );
  }

  const dbUser = await ensureOAuthSubjectUser({
    provider: 'apple',
    providerSubject: session.user.id,
    email: session.user.email,
    ...(session.user.name !== undefined ? { name: session.user.name } : {}),
    ...(session.user.image !== undefined ? { image: session.user.image } : {}),
  });

  if (!dbUser) {
    logger.error('[auth:mobile] callback could not map provider user to internal user', {
      clientIp,
      flowId,
    });
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'session_user_not_found',
        error_description: 'Unable to map authenticated subject to an internal user record.',
        state: flow.state,
      }),
    );
  }

  const tokenPair = await createTokenPairForUser({
    userId: dbUser.id,
    role: dbUser.isAdmin ? 'admin' : 'user',
    scope: ['api:read', 'api:write'],
    amr: ['oauth', 'mobile'],
  });

  const exchangeCode = createOpaqueCode(24);
  const exchangePayload: MobileExchangePayload = {
    redirectUri: flow.redirectUri,
    codeChallenge: flow.codeChallenge,
    state: flow.state,
    token: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
      sessionId: tokenPair.sessionId,
      refreshFamilyId: tokenPair.refreshFamilyId,
    },
  };

  try {
    const redis = await getRedis();
    await redis.set(
      getMobileExchangeKey(exchangeCode),
      JSON.stringify(exchangePayload),
      'EX',
      MOBILE_EXCHANGE_TTL_SECONDS,
    );
  } catch (error) {
    logger.error('[auth:mobile] failed to persist mobile exchange payload', {
      clientIp,
      flowId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'exchange_unavailable',
        error_description: 'Unable to persist secure mobile exchange payload.',
        state: flow.state,
      }),
    );
  }

  return c.redirect(
    appendQueryParams(flow.redirectUri, {
      code: exchangeCode,
      state: flow.state,
    }),
  );
});

authRoutes.post('/mobile/exchange', zValidator('json', mobileExchangeSchema), async (c) => {
  const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = c.req.valid('json');
  const clientIp = getClientIp(c);

  if (!isAllowedMobileRedirectUri(redirectUri)) {
    logger.warn('[auth:mobile] rejected exchange due to redirect URI allowlist mismatch', {
      clientIp,
      redirectUri,
    });
    return c.json({ error: 'invalid_redirect_uri' }, 400);
  }

  let exchange: MobileExchangePayload | null = null;
  try {
    const redis = await getRedis();
    const rawExchange = await redis.get(getMobileExchangeKey(code));
    if (!rawExchange) {
      logger.warn('[auth:mobile] exchange code is invalid or expired', {
        clientIp,
      });
      return c.json(
        { error: 'invalid_grant', message: 'Exchange code is invalid or expired.' },
        400,
      );
    }
    await redis.del(getMobileExchangeKey(code));

    const parsed = z
      .object({
        redirectUri: z.string().url(),
        codeChallenge: z.string().min(43).max(128),
        state: z.string().min(8).max(256),
        token: z.object({
          accessToken: z.string().min(16),
          refreshToken: z.string().min(16),
          tokenType: z.string().min(3),
          expiresIn: z.number().int().positive(),
          sessionId: z.string().uuid(),
          refreshFamilyId: z.string().uuid(),
        }),
      })
      .safeParse(JSON.parse(rawExchange));

    if (!parsed.success) {
      logger.warn('[auth:mobile] exchange payload validation failed', {
        clientIp,
      });
      return c.json({ error: 'invalid_grant', message: 'Malformed exchange payload.' }, 400);
    }

    exchange = parsed.data;
  } catch (error) {
    logger.error('[auth:mobile] exchange lookup failed', {
      clientIp,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.json({ error: 'exchange_unavailable' }, 503);
  }

  if (!exchange) {
    logger.warn('[auth:mobile] exchange payload missing after lookup', {
      clientIp,
    });
    return c.json({ error: 'invalid_grant' }, 400);
  }

  if (exchange.redirectUri !== redirectUri) {
    logger.warn('[auth:mobile] exchange redirect URI mismatch', {
      clientIp,
      requestRedirectUri: redirectUri,
      storedRedirectUri: exchange.redirectUri,
    });
    return c.json({ error: 'invalid_grant', message: 'Redirect URI mismatch.' }, 400);
  }

  const computedChallenge = hashPkceVerifier(codeVerifier);
  if (computedChallenge !== exchange.codeChallenge) {
    logger.warn('[auth:mobile] exchange PKCE verification failed', {
      clientIp,
    });
    return c.json({ error: 'invalid_grant', message: 'PKCE verifier mismatch.' }, 400);
  }

  return c.json({
    access_token: exchange.token.accessToken,
    refresh_token: exchange.token.refreshToken,
    token_type: exchange.token.tokenType,
    expires_in: exchange.token.expiresIn,
    session_id: exchange.token.sessionId,
    refresh_family_id: exchange.token.refreshFamilyId,
  });
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
  const email = payload.email ?? 'mobile-e2e@hominem.local';
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

  const tokenPair = await createE2eTokenPairForUser({
    userId: user.id,
    role: user.isAdmin ? 'admin' : 'user',
  });

  logger.info('[auth:e2e:mobile] issued token pair', {
    clientIp,
    emailHash,
    userId: user.id,
    sessionId: tokenPair.sessionId,
    refreshFamilyId: tokenPair.refreshFamilyId,
  });

  const response: MobileE2eLoginResponse = {
    access_token: tokenPair.accessToken,
    refresh_token: tokenPair.refreshToken,
    token_type: tokenPair.tokenType,
    expires_in: tokenPair.expiresIn,
    session_id: tokenPair.sessionId,
    refresh_family_id: tokenPair.refreshFamilyId,
    provider: 'better-auth',
  };

  return c.json(response);
});

authRoutes.post('/cli/authorize', zValidator('json', cliAuthorizeSchema), async (c) => {
  const cliAuthorizeRateLimit = await enforceAuthRateLimit(c, {
    bucket: 'cli-authorize',
    identifier: getClientIp(c),
    windowSec: AUTH_CLI_AUTHORIZE_LIMIT_WINDOW_SECONDS,
    max: AUTH_CLI_AUTHORIZE_LIMIT_MAX,
  });
  if (cliAuthorizeRateLimit) {
    return cliAuthorizeRateLimit;
  }

  const {
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    state,
    scope,
  } = c.req.valid('json');
  const clientIp = getClientIp(c);

  if (!isAllowedCliRedirectUri(redirectUri)) {
    logger.warn('[auth:cli] rejected authorize request due to non-loopback redirect URI', {
      clientIp,
      redirectUri,
    });
    return c.json(
      {
        error: 'invalid_redirect_uri',
        message: 'CLI redirect URI must target localhost/127.0.0.1 loopback.',
      },
      400,
    );
  }

  const flowId = createOpaqueCode(24);
  const callbackUrl = new URL('/api/auth/cli/callback', env.BETTER_AUTH_URL);
  callbackUrl.searchParams.set('flow_id', flowId);

  try {
    const redis = await getRedis();
    const payload: CliFlowPayload = {
      redirectUri,
      codeChallenge,
      state,
      scope: parseCliScopes(scope),
    };
    await redis.set(getCliFlowKey(flowId), JSON.stringify(payload), 'EX', CLI_FLOW_TTL_SECONDS);
  } catch (error) {
    logger.error('[auth:cli] failed to persist cli authorize flow', {
      clientIp,
      flowId,
      redirectUri,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return c.json({ error: 'flow_unavailable' }, 503);
  }

  const startUrl = new URL('/api/auth/authorize', env.BETTER_AUTH_URL);
  startUrl.searchParams.set('provider', 'apple');
  startUrl.searchParams.set('redirect_uri', callbackUrl.toString());

  logger.info('[auth:cli] created cli authorize flow', {
    clientIp,
    flowId,
  });

  return c.json({
    authorization_url: startUrl.toString(),
    flow_id: flowId,
  });
});

authRoutes.get('/cli/callback', async (c) => {
  const flowId = c.req.query('flow_id');
  if (!flowId) {
    return c.text('Missing flow id', 400);
  }

  let flow: CliFlowPayload | null = null;
  try {
    const redis = await getRedis();
    const rawFlow = await redis.get(getCliFlowKey(flowId));
    if (!rawFlow) {
      return c.text('Authorization flow expired', 400);
    }
    await redis.del(getCliFlowKey(flowId));
    flow = z
      .object({
        redirectUri: z.string().url(),
        codeChallenge: z.string().min(43).max(128),
        state: z.string().min(8).max(256),
        scope: z.array(z.string()).default(CLI_DEFAULT_SCOPES),
      })
      .parse(JSON.parse(rawFlow));
  } catch {
    return c.text('Failed to resume authorization flow', 503);
  }

  if (!flow || !isAllowedCliRedirectUri(flow.redirectUri)) {
    return c.text('Invalid cli flow payload', 400);
  }

  const errorParam = c.req.query('error');
  if (errorParam) {
    const errorDescription = c.req.query('error_description') ?? 'Apple sign-in failed';
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: errorParam,
        error_description: errorDescription,
        state: flow.state,
      }),
    );
  }

  const session = await betterAuthServer.api.getSession({
    ...getHeaderCarrier(c),
  });

  if (!session?.user) {
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'session_not_found',
        error_description: 'Unable to establish authenticated session after callback.',
        state: flow.state,
      }),
    );
  }

  const dbUser = await ensureOAuthSubjectUser({
    provider: 'apple',
    providerSubject: session.user.id,
    email: session.user.email,
    ...(session.user.name !== undefined ? { name: session.user.name } : {}),
    ...(session.user.image !== undefined ? { image: session.user.image } : {}),
  });

  if (!dbUser) {
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'session_user_not_found',
        error_description: 'Unable to map authenticated subject to an internal user record.',
        state: flow.state,
      }),
    );
  }

  const tokenPair = await createTokenPairForUser({
    userId: dbUser.id,
    role: dbUser.isAdmin ? 'admin' : 'user',
    scope: flow.scope,
    amr: ['oauth', 'cli'],
  });

  const exchangeCode = createOpaqueCode(24);
  const exchangePayload: CliExchangePayload = {
    redirectUri: flow.redirectUri,
    codeChallenge: flow.codeChallenge,
    state: flow.state,
    scope: flow.scope,
    token: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenType: tokenPair.tokenType,
      expiresIn: tokenPair.expiresIn,
      sessionId: tokenPair.sessionId,
      refreshFamilyId: tokenPair.refreshFamilyId,
    },
  };

  try {
    const redis = await getRedis();
    await redis.set(
      getCliExchangeKey(exchangeCode),
      JSON.stringify(exchangePayload),
      'EX',
      CLI_EXCHANGE_TTL_SECONDS,
    );
  } catch {
    return c.redirect(
      appendQueryParams(flow.redirectUri, {
        error: 'exchange_unavailable',
        error_description: 'Unable to persist secure cli exchange payload.',
        state: flow.state,
      }),
    );
  }

  return c.redirect(
    appendQueryParams(flow.redirectUri, {
      code: exchangeCode,
      state: flow.state,
    }),
  );
});

authRoutes.post('/cli/exchange', zValidator('json', cliExchangeSchema), async (c) => {
  const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = c.req.valid('json');

  if (!isAllowedCliRedirectUri(redirectUri)) {
    return c.json({ error: 'invalid_redirect_uri' }, 400);
  }

  let exchange: CliExchangePayload | null = null;
  try {
    const redis = await getRedis();
    const rawExchange = await redis.get(getCliExchangeKey(code));
    if (!rawExchange) {
      return c.json(
        { error: 'invalid_grant', message: 'Exchange code is invalid or expired.' },
        400,
      );
    }
    await redis.del(getCliExchangeKey(code));

    const parsed = z
      .object({
        redirectUri: z.string().url(),
        codeChallenge: z.string().min(43).max(128),
        state: z.string().min(8).max(256),
        scope: z.array(z.string()).default(CLI_DEFAULT_SCOPES),
        token: z.object({
          accessToken: z.string().min(16),
          refreshToken: z.string().min(16),
          tokenType: z.string().min(3),
          expiresIn: z.number().int().positive(),
          sessionId: z.string().uuid(),
          refreshFamilyId: z.string().uuid(),
        }),
      })
      .safeParse(JSON.parse(rawExchange));

    if (!parsed.success) {
      return c.json({ error: 'invalid_grant', message: 'Malformed exchange payload.' }, 400);
    }

    exchange = parsed.data;
  } catch {
    return c.json({ error: 'exchange_unavailable' }, 503);
  }

  if (!exchange) {
    return c.json({ error: 'invalid_grant' }, 400);
  }

  if (exchange.redirectUri !== redirectUri) {
    return c.json({ error: 'invalid_grant', message: 'Redirect URI mismatch.' }, 400);
  }

  const computedChallenge = hashPkceVerifier(codeVerifier);
  if (computedChallenge !== exchange.codeChallenge) {
    return c.json({ error: 'invalid_grant', message: 'PKCE verifier mismatch.' }, 400);
  }

  return c.json({
    access_token: exchange.token.accessToken,
    refresh_token: exchange.token.refreshToken,
    token_type: exchange.token.tokenType,
    expires_in: exchange.token.expiresIn,
    session_id: exchange.token.sessionId,
    refresh_family_id: exchange.token.refreshFamilyId,
    scope: exchange.scope.join(' '),
    provider: 'better-auth' as const,
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
  const user = c.get('user');
  const auth = c.get('auth');

  if (user && auth) {
    const token = await issueAccessToken({
      sub: auth.sub,
      sid: auth.sid,
      scope: auth.scope,
      role: auth.role,
      amr: auth.amr,
    });

    return c.json({
      isAuthenticated: true,
      user,
      auth,
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
    });
  }

  const session = await betterAuthServer.api.getSession({
    ...getHeaderCarrier(c),
  });

  if (!session?.user) {
    return c.json({
      isAuthenticated: false,
      user: null,
      auth: null,
      accessToken: null,
      expiresIn: null,
    });
  }

  const sid = session.session?.id ?? crypto.randomUUID();
  const dbUser = await ensureOAuthSubjectUser({
    provider: 'apple',
    providerSubject: session.user.id,
    email: session.user.email,
    ...(session.user.name !== undefined ? { name: session.user.name } : {}),
    ...(session.user.image !== undefined ? { image: session.user.image } : {}),
  });

  if (!dbUser) {
    return c.json({ error: 'session_user_not_found' }, 401);
  }

  const token = await issueAccessToken({
    sub: dbUser.id,
    sid,
    role: dbUser.isAdmin ? 'admin' : 'user',
    scope: ['api:read', 'api:write'],
    amr: ['oauth'],
  });

  return c.json({
    isAuthenticated: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? undefined,
      image: dbUser.image ?? undefined,
      isAdmin: dbUser.isAdmin,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    },
    auth: {
      sub: dbUser.id,
      sid,
      scope: ['api:read', 'api:write'],
      role: dbUser.isAdmin ? 'admin' : 'user',
      amr: ['oauth'],
      authTime: Math.floor(Date.now() / 1000),
    },
    accessToken: token.accessToken,
    expiresIn: token.expiresIn,
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

authRoutes.post('/link/google/start', async (c) => {
  const userId = c.get('userId');
  const clientIp = getClientIp(c);
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const redirectUri =
    c.req.query('redirect_uri') ?? new URL('/account', env.BETTER_AUTH_URL).toString();

  if (!isAllowedWebRedirectUri(redirectUri)) {
    logger.warn('[auth:link-google] rejected link start due to redirect URI allowlist mismatch', {
      clientIp,
      userId,
      redirectUri,
    });
    return c.json(
      {
        error: 'invalid_redirect_uri',
        message: 'Google link redirect URI is not on the allowlist.',
      },
      400,
    );
  }

  const response = await callBetterAuthPluginEndpoint({
    request: c.req.raw,
    path: '/link-social',
    method: 'POST',
    body: {
      provider: 'google',
      callbackURL: redirectUri,
      disableRedirect: false,
    },
  });

  const normalized = normalizeRedirectResponse(response);
  if (!normalized.headers.get('location')) {
    logger.warn('[auth:link-google] link start did not return redirect location', {
      clientIp,
      userId,
      redirectUri,
      status: normalized.status,
    });
    return c.json({ error: 'link_failed' }, 400);
  }

  logger.info('[auth:link-google] started google account linking flow', {
    clientIp,
    userId,
    redirectUri,
  });

  return normalized;
});

authRoutes.get('/link/google/status', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const [linkedGoogleSubject] = await db
    .select({ id: authSubjects.id })
    .from(authSubjects)
    .where(
      and(
        eq(authSubjects.userId, userId),
        eq(authSubjects.provider, 'google'),
        isNull(authSubjects.unlinkedAt),
      ),
    )
    .limit(1);

  return c.json({
    isLinked: Boolean(linkedGoogleSubject),
  });
});

authRoutes.post('/link/google/unlink', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const stepUpGranted = await consumeStepUp(userId, 'google_unlink').catch(() => false);
  if (!stepUpGranted) {
    return c.json(
      {
        error: 'step_up_required',
        message: 'Passkey step-up is required before unlinking Google.',
        action: 'google_unlink',
      },
      403,
    );
  }

  const body = (await c.req.json().catch(() => ({}))) as { accountId?: string };
  await betterAuthServer.api.unlinkAccount({
    body: {
      providerId: 'google',
      ...(body.accountId ? { accountId: body.accountId } : {}),
    },
    ...getHeaderCarrier(c),
  });

  return c.json({ success: true });
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
    const payload = await response.json();
    return c.json(payload as Record<string, unknown>, response.status as 200 | 400 | 401);
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
      const payload = await response.json();
      return c.json(payload as Record<string, unknown>, response.status as 200 | 400 | 401);
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
    const payload = await response.json();
    return c.json(payload as Record<string, unknown>, response.status as 200 | 400 | 401);
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
    const responseBody = await response.json();
    const userId = c.get('userId');
    const requestedAction = body.action;
    if (response.status >= 200 && response.status < 300 && userId && requestedAction) {
      await grantStepUp(userId, requestedAction).catch(() => null);
    }
    return c.json(responseBody as Record<string, unknown>, response.status as 200 | 400 | 401);
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
