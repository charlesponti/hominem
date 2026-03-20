import { describe, expect, test, vi } from 'vitest';

import { importServerWithEnv } from './test-helpers/auth';

describe('mobile e2e login guard', () => {
  test('returns 404 in production mode even when e2e auth flag is enabled', async () => {
    const createServer = await importServerWithEnv({
      NODE_ENV: 'production',
      AUTH_E2E_ENABLED: true,
      AUTH_E2E_SECRET: 'test-secret',
    });
    try {
      const app = createServer();
      const response = await app.request('http://localhost/api/auth/mobile/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'test-secret',
        },
        body: JSON.stringify({ email: 'mobile-e2e@hominem.test' }),
      });

      expect(response.status).toBe(404);
    } finally {
      vi.doUnmock('../../env');
    }
  }, 15000);

  test('returns 403 when secret is missing or invalid', async () => {
    const createServer = await importServerWithEnv({
      NODE_ENV: 'development',
      AUTH_E2E_ENABLED: true,
      AUTH_E2E_SECRET: 'expected-secret',
    });
    try {
      const app = createServer();
      const response = await app.request('http://localhost/api/auth/mobile/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'wrong-secret',
        },
        body: JSON.stringify({ email: 'mobile-e2e@hominem.test' }),
      });

      expect(response.status).toBe(403);
    } finally {
      vi.doUnmock('../../env');
    }
  }, 15000);

  test('accepts passkey AMR for deterministic mobile passkey e2e flows', async () => {
    const createServer = await importServerWithEnv({
      NODE_ENV: 'development',
      AUTH_E2E_ENABLED: true,
      AUTH_E2E_SECRET: 'test-secret',
    });
    try {
      const app = createServer();
      const response = await app.request('http://localhost/api/auth/mobile/e2e/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-e2e-auth-secret': 'test-secret',
        },
        body: JSON.stringify({
          email: 'mobile-passkey-e2e@hominem.test',
          amr: ['passkey', 'e2e', 'mobile'],
        }),
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { access_token: string; provider: string };
      expect(body.access_token.length).toBeGreaterThan(10);
      expect(body.provider).toBe('better-auth');
    } finally {
      vi.doUnmock('../../env');
    }
  }, 15000);
});
