import type { ApiEnv } from '@hominem/env';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer } from '../../auth/better-auth';
import { env } from '../../env';
import type { AppEnv } from '../../server';
import { getScriptedEmail } from '../../testkit/resend.mock';
import type { AuthDependencies } from './shared';

const testOtpQuerySchema = z.object({
  email: z.string().email(),
  type: z.string().min(1).optional(),
});

// Lets an E2E client read the OTP that a real user would have received by
// email. It reads it from the scripted Resend mock (see
// ../../testkit/resend.mock.ts), which captures the real, randomly generated
// OTP at the outbound vendor boundary — the OTP itself is never hardcoded or
// bypassed in application auth logic. Inert unless the operator has
// explicitly enabled both flags below outside production.
function isE2eAuthEnabled(inputEnv: ApiEnv) {
  return (
    inputEnv.AUTH_E2E_ENABLED &&
    inputEnv.HOMINEM_EMAIL_PROVIDER === 'scripted' &&
    inputEnv.NODE_ENV !== 'production'
  );
}

export function createTestAuthRoutes(dependencies: AuthDependencies) {
  const routes = new Hono<AppEnv>();

  routes.get('/test/otp/latest', zValidator('query', testOtpQuerySchema), async (c) => {
    if (!isE2eAuthEnabled(dependencies.env)) return c.json({ error: 'not_found' }, 404);

    const providedSecret = c.req.header('x-e2e-auth-secret');
    if (!providedSecret || providedSecret !== dependencies.env.AUTH_E2E_SECRET) {
      return c.json({ error: 'forbidden' }, 403);
    }

    const query = c.req.valid('query');
    const scriptedEmail = getScriptedEmail(query.email);
    if (!scriptedEmail?.otp) return c.json({ error: 'otp_not_found' }, 404);

    return c.json({
      email: scriptedEmail.to,
      otp: scriptedEmail.otp,
      type: query.type ?? 'sign-in',
      capturedAt: scriptedEmail.capturedAt,
    });
  });

  return routes;
}

export const testAuthRoutes = createTestAuthRoutes({ env, auth: betterAuthServer });
