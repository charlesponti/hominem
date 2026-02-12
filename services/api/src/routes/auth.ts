import { Hono } from 'hono';

import type { AppEnv } from '../server';

import { supabaseClient } from '../middleware/supabase';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/refresh-token', async (c) => {
  const { refresh_token: refreshToken } = (await c.req.json().catch(() => ({}))) as {
    refresh_token?: string;
  };

  if (!refreshToken) {
    return c.json({ error: 'refresh_token required' }, 400);
  }

  const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    return c.json({ error: 'invalid_refresh_token' }, 401);
  }

  const session = data.session;

  return c.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? undefined,
    expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined,
    provider: 'supabase' as const,
  });
});

authRoutes.post('/token', async (c) => {
  const {
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  } = (await c.req.json().catch(() => ({}))) as {
    code?: string;
    code_verifier?: string;
    redirect_uri?: string;
  };

  if (!code || !codeVerifier) {
    return c.json({ error: 'code and code_verifier required' }, 400);
  }

  const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return c.json({ error: 'invalid_grant' }, 401);
  }

  const session = data.session;

  return c.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? undefined,
    expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined,
    provider: 'supabase' as const,
  });
});

// Device-code endpoints are stubbed until we finalize provider (Supabase/WorkOS)
authRoutes.post('/device/code', (c) => {
  return c.json(
    {
      error: 'device_code_not_supported',
      message: 'Device code flow is not yet available. Use browser login via /auth/cli.',
    },
    501,
  );
});

authRoutes.post('/device/token', (c) => {
  return c.json(
    {
      error: 'device_code_not_supported',
      message: 'Device code flow is not yet available. Use browser login via /auth/cli.',
    },
    501,
  );
});
