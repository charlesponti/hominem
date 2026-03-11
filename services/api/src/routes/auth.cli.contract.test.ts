import { createHash, randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ─── helpers ────────────────────────────────────────────────────────────────

function createPkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function importServer() {
  const module = await import('../server');
  return module.createServer;
}

interface CliTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  session_id: string;
  refresh_family_id: string;
  scope: string;
  provider: string;
}

interface SessionResponse {
  isAuthenticated: boolean;
  user?: { id: string; email: string } | null;
}

// ─── guards ─────────────────────────────────────────────────────────────────

describe('CLI auth contract', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_E2E_ENABLED = 'true';
    process.env.AUTH_E2E_SECRET = 'cli-e2e-secret';
  });

  // ── CLI/authorize ──────────────────────────────────────────────────────────

  describe('POST /api/auth/cli/authorize', () => {
    test('returns authorization_url for valid loopback redirect_uri', async () => {
      const createServer = await importServer();
      const app = createServer();
      const { challenge } = createPkcePair();

      const response = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: 'http://127.0.0.1:51234/callback',
          code_challenge: challenge,
          state: 'test-state-abc',
        }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { authorization_url: string };
      expect(typeof body.authorization_url).toBe('string');
      expect(body.authorization_url.length).toBeGreaterThan(10);
      expect(body.authorization_url).toContain('/api/auth/cli/callback');
      expect(body.authorization_url).toContain('session=');
    }, 15000);

    test('rejects non-loopback redirect_uri', async () => {
      const createServer = await importServer();
      const app = createServer();
      const { challenge } = createPkcePair();

      const response = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: 'https://evil.example.com/callback',
          code_challenge: challenge,
          state: 'test-state-abc',
        }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('invalid_redirect_uri');
    }, 15000);

    test('rejects missing required fields', async () => {
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: 'http://127.0.0.1:51234/callback',
          // missing code_challenge and state
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }, 15000);

    test('rejects code_challenge that is too short', async () => {
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: 'http://127.0.0.1:51234/callback',
          code_challenge: 'short',
          state: 'test-state',
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }, 15000);
  });

  // ── CLI/exchange ───────────────────────────────────────────────────────────

  describe('POST /api/auth/cli/exchange', () => {
    test('rejects unknown authorization code', async () => {
      const createServer = await importServer();
      const app = createServer();
      const { verifier } = createPkcePair();

      const response = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: randomBytes(32).toString('base64url'),
          code_verifier: verifier,
          redirect_uri: 'http://127.0.0.1:51234/callback',
        }),
      });

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe('invalid_grant');
    }, 15000);

    test('rejects missing fields', async () => {
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // missing code, code_verifier, redirect_uri
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    }, 15000);
  });

  // ── CLI/e2e/login ──────────────────────────────────────────────────────────

  describe('POST /api/auth/cli/e2e/login', () => {
    test('returns 404 in production mode even when e2e flag is enabled', async () => {
      process.env.NODE_ENV = 'production';
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email: 'cli-prod-guard@hominem.test' }),
      });

      expect(response.status).toBe(404);
    }, 15000);

    test('returns 403 when secret is missing', async () => {
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'cli-no-secret@hominem.test' }),
      });

      expect(response.status).toBe(403);
    }, 15000);

    test('returns 403 when secret is wrong', async () => {
      const createServer = await importServer();
      const app = createServer();

      const response = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'wrong-secret',
        },
        body: JSON.stringify({ email: 'cli-wrong-secret@hominem.test' }),
      });

      expect(response.status).toBe(403);
    }, 15000);

    test('issues CLI token pair for a new user', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-e2e-new-${Date.now()}@hominem.test`;

      const response = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email, name: 'CLI E2E Test User' }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as CliTokenResponse;
      expect(body.access_token.length).toBeGreaterThan(10);
      expect(body.refresh_token.length).toBeGreaterThan(10);
      expect(body.token_type).toBe('Bearer');
      expect(body.expires_in).toBeGreaterThan(0);
      expect(body.session_id.length).toBeGreaterThan(0);
      expect(body.refresh_family_id.length).toBeGreaterThan(0);
      expect(body.provider).toBe('better-auth');
    }, 15000);

    test('reuses existing user on repeated logins', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-e2e-reuse-${Date.now()}@hominem.test`;

      const firstResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(firstResponse.status).toBe(200);

      const secondResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(secondResponse.status).toBe(200);

      const firstBody = (await firstResponse.json()) as CliTokenResponse;
      const secondBody = (await secondResponse.json()) as CliTokenResponse;

      // Both tokens should be valid but different (fresh token issuance each time)
      expect(firstBody.access_token).not.toBe(secondBody.access_token);
    }, 15000);

    test('issued access token authenticates against /api/auth/session', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-e2e-session-${Date.now()}@hominem.test`;

      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(loginResponse.status).toBe(200);
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      const sessionResponse = await app.request('http://localhost/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginBody.access_token}`,
        },
      });

      expect(sessionResponse.status).toBe(200);
      const sessionBody = (await sessionResponse.json()) as SessionResponse;
      expect(sessionBody.isAuthenticated).toBe(true);
      expect(sessionBody.user?.email).toBe(email);
    }, 15000);

    test('issued refresh token can be used to get a new access token', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-e2e-refresh-${Date.now()}@hominem.test`;

      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(loginResponse.status).toBe(200);
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      const refreshResponse = await app.request('http://localhost/api/auth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: loginBody.refresh_token,
        }),
      });

      expect(refreshResponse.status).toBe(200);
      const refreshBody = (await refreshResponse.json()) as CliTokenResponse;
      expect(refreshBody.access_token.length).toBeGreaterThan(10);
      expect(refreshBody.access_token).not.toBe(loginBody.access_token);
    }, 15000);

    test('logout revokes the CLI session', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-e2e-logout-${Date.now()}@hominem.test`;

      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(loginResponse.status).toBe(200);
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      const logoutResponse = await app.request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${loginBody.access_token}`,
        },
      });
      expect(logoutResponse.status).toBe(200);

      const sessionAfterLogout = await app.request('http://localhost/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginBody.access_token}`,
        },
      });
      expect(sessionAfterLogout.status).toBe(401);
    }, 15000);
  });

  // ── Full PKCE round-trip (authorize → callback → exchange) ─────────────────

  describe('CLI PKCE round-trip via /cli/callback', () => {
    test('issues tokens via full PKCE flow when user is already authenticated', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-pkce-${Date.now()}@hominem.test`;
      const { verifier, challenge } = createPkcePair();
      const state = randomBytes(8).toString('hex');
      const redirectUri = 'http://127.0.0.1:59876/callback';

      // Step 1: Authenticate the user via e2e login to get a bearer token
      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(loginResponse.status).toBe(200);
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      // Step 2: Start the PKCE flow
      const authorizeResponse = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: redirectUri,
          code_challenge: challenge,
          state,
        }),
      });
      expect(authorizeResponse.status).toBe(200);
      const authorizeBody = (await authorizeResponse.json()) as { authorization_url: string };
      const authUrl = new URL(authorizeBody.authorization_url);
      const sessionId = authUrl.searchParams.get('session');
      expect(sessionId).toBeTruthy();

      // Step 3: Visit the callback with the authenticated user's bearer token
      // The callback issues a code and redirects to the CLI redirect_uri
      const callbackUrl = `http://localhost/api/auth/cli/callback?session=${sessionId}`;
      const callbackResponse = await app.request(callbackUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginBody.access_token}`,
        },
      });
      expect(callbackResponse.status).toBe(302);

      const location = callbackResponse.headers.get('location');
      expect(location).toBeTruthy();
      const callbackRedirect = new URL(location!);
      expect(callbackRedirect.origin + callbackRedirect.pathname).toBe(redirectUri);
      expect(callbackRedirect.searchParams.get('state')).toBe(state);

      const code = callbackRedirect.searchParams.get('code');
      expect(code).toBeTruthy();

      // Step 4: Exchange the code for tokens
      const exchangeResponse = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: verifier,
          redirect_uri: redirectUri,
        }),
      });
      expect(exchangeResponse.status).toBe(200);
      const tokens = (await exchangeResponse.json()) as CliTokenResponse;
      expect(tokens.access_token.length).toBeGreaterThan(10);
      expect(tokens.refresh_token.length).toBeGreaterThan(10);
      expect(tokens.provider).toBe('better-auth');

      // Step 5: Verify the token works
      const sessionResponse = await app.request('http://localhost/api/auth/session', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      expect(sessionResponse.status).toBe(200);
      const sessionBody = (await sessionResponse.json()) as SessionResponse;
      expect(sessionBody.isAuthenticated).toBe(true);
    }, 30000);

    test('exchange fails when code_verifier does not match code_challenge', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-pkce-bad-verifier-${Date.now()}@hominem.test`;
      const { challenge } = createPkcePair();
      const { verifier: wrongVerifier } = createPkcePair(); // different pair
      const state = randomBytes(8).toString('hex');
      const redirectUri = 'http://127.0.0.1:59877/callback';

      // Authenticate user
      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      expect(loginResponse.status).toBe(200);
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      // Start PKCE flow
      const authorizeResponse = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ redirect_uri: redirectUri, code_challenge: challenge, state }),
      });
      const authorizeBody = (await authorizeResponse.json()) as { authorization_url: string };
      const sessionId = new URL(authorizeBody.authorization_url).searchParams.get('session');

      // Visit callback
      const callbackResponse = await app.request(
        `http://localhost/api/auth/cli/callback?session=${sessionId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${loginBody.access_token}` },
          },
      );
      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get('location')!;
      const code = new URL(location).searchParams.get('code')!;

      // Try to exchange with wrong verifier
      const exchangeResponse = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: wrongVerifier,
          redirect_uri: redirectUri,
        }),
      });

      expect(exchangeResponse.status).toBe(400);
      const body = (await exchangeResponse.json()) as { error: string };
      expect(body.error).toBe('invalid_code_verifier');
    }, 30000);

    test('exchange code cannot be reused (replay protection)', async () => {
      const createServer = await importServer();
      const app = createServer();
      const email = `cli-pkce-replay-${Date.now()}@hominem.test`;
      const { verifier, challenge } = createPkcePair();
      const state = randomBytes(8).toString('hex');
      const redirectUri = 'http://127.0.0.1:59878/callback';

      // Authenticate user
      const loginResponse = await app.request('http://localhost/api/auth/cli/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'cli-e2e-secret',
        },
        body: JSON.stringify({ email }),
      });
      const loginBody = (await loginResponse.json()) as CliTokenResponse;

      // Start PKCE flow
      const authorizeResponse = await app.request('http://localhost/api/auth/cli/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ redirect_uri: redirectUri, code_challenge: challenge, state }),
      });
      const authorizeBody = (await authorizeResponse.json()) as { authorization_url: string };
      const sessionId = new URL(authorizeBody.authorization_url).searchParams.get('session');

      // Visit callback to get code
      const callbackResponse = await app.request(
        `http://localhost/api/auth/cli/callback?session=${sessionId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${loginBody.access_token}` },
          },
      );
      const location = callbackResponse.headers.get('location')!;
      const code = new URL(location).searchParams.get('code')!;

      // First exchange - should succeed
      const firstExchange = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
      });
      expect(firstExchange.status).toBe(200);

      // Second exchange (replay) - should fail
      const replayExchange = await app.request('http://localhost/api/auth/cli/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
      });
      expect(replayExchange.status).toBe(400);
      const body = (await replayExchange.json()) as { error: string };
      expect(body.error).toBe('invalid_grant');
    }, 30000);
  });
});
