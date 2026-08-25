import { createHash } from 'node:crypto';

import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { TEST_OTP } from '../../auth/better-auth';
import { getLatestTestOtp, isTestOtpStoreEnabled } from '../../auth/test-otp-store';
import { env } from '../../env';
import { getClientIp } from '../../middleware/client-ip';
import type { AppEnv } from '../../server';
import { callBetterAuthPluginEndpoint, copyHeadersWithSetCookie } from './shared';

const mobileE2eLoginSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(128).optional(),
});

const testOtpQuerySchema = z.object({
  email: z.string().email(),
  type: z.string().min(1).optional(),
});

function isE2eAuthEnabled() {
  return env.AUTH_E2E_ENABLED && env.NODE_ENV !== 'production';
}

export const testAuthRoutes = new Hono<AppEnv>();

testAuthRoutes.post('/mobile/e2e/login', zValidator('json', mobileE2eLoginSchema), async (c) => {
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
      logger.warn('[auth:e2e:mobile] denied because e2e auth is disabled', {
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
  if (!userId) return c.json({ error: 'e2e_user_missing' }, 500);

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

testAuthRoutes.get('/test/otp/latest', zValidator('query', testOtpQuerySchema), async (c) => {
  if (!isTestOtpStoreEnabled()) return c.json({ error: 'not_found' }, 404);

  const providedSecret = c.req.header('x-e2e-auth-secret');
  if (!providedSecret || providedSecret !== env.AUTH_E2E_SECRET) {
    return c.json({ error: 'forbidden' }, 403);
  }

  const query = c.req.valid('query');
  const record = getLatestTestOtp({
    email: query.email,
    ...(query.type ? { type: query.type } : {}),
  });
  if (!record) return c.json({ error: 'otp_not_found' }, 404);

  return c.json({
    email: record.email,
    otp: record.otp,
    type: record.type,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
  });
});
