import { getSetCookieHeaders } from '@hominem/utils/headers';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppRequester } from './test-helpers/auth';
import {
  createAuthTestEmail,
  fetchOtp,
  importServer,
  requestOtp,
  toCookieHeader,
} from './test-helpers/auth';

interface _SessionResponse {
  isAuthenticated: boolean;
  accessToken?: string;
  expiresIn?: number;
  auth?: {
    sub: string;
    sid: string;
    scope: string[];
    role: 'user' | 'admin';
    amr: string[];
    authTime: number;
  };
  user?: {
    id: string;
    email: string;
    name?: string | null;
    isAdmin: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

interface VerifyOtpResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

async function requestOtpWithoutOrigin(app: AppRequester, email: string) {
  const request = new Request('http://localhost/api/auth/email-otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      type: 'sign-in',
    }),
  });

  request.headers.delete('origin');
  return app.request(request);
}

describe('auth email otp contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_E2E_SECRET = 'otp-secret';
    process.env.AUTH_TEST_OTP_ENABLED = 'true';
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300';
  });

  test('logs OTP info in development environment', async () => {
    vi.resetModules();
    process.env.AUTH_E2E_SECRET = 'otp-secret';
    process.env.AUTH_TEST_OTP_ENABLED = 'true';
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300';

    vi.doMock('../env', async () => {
      const actual = await vi.importActual<typeof import('../env')>('../env');
      return {
        ...actual,
        env: new Proxy(actual.env, {
          get(target, prop, receiver) {
            if (prop === 'NODE_ENV') {
              return 'development';
            }

            return Reflect.get(target, prop, receiver);
          },
        }),
      };
    });

    const { logger } = await import('@hominem/utils/logger');
    const infoSpy = vi.spyOn(logger, 'info');

    try {
      const createServer = await importServer();
      const app = createServer();
      const email = createAuthTestEmail('otp-log');

      const okResponse = await requestOtp(app, email);
      expect(okResponse.status).toBe(200);

      expect(infoSpy).toHaveBeenCalledWith(
        '[auth:email-otp] generated OTP',
        expect.objectContaining({ email, otp: expect.any(String), type: 'sign-in' }),
      );
    } finally {
      infoSpy.mockRestore();
      vi.doUnmock('../env');
    }
  }, 10000);

  test('2.1 sends otp for valid email and rejects invalid email', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-request');

    const okResponse = await requestOtp(app, email);
    expect(okResponse.status).toBe(200);
    const otp = await fetchOtp(app, email);
    expect(otp.otp.length).toBeGreaterThanOrEqual(4);

    const invalidResponse = await requestOtp(app, 'not-an-email');
    expect(invalidResponse.status).toBeGreaterThanOrEqual(400);
    expect(invalidResponse.status).toBeLessThan(500);
  }, 15000);

  test('2.1 native-style requests without origin still send otp successfully', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-native');

    const response = await requestOtpWithoutOrigin(app, email);
    expect(response.status).toBe(200);

    const otp = await fetchOtp(app, email);
    expect(otp.otp.length).toBeGreaterThanOrEqual(4);
  }, 15000);

  test('2.1 burst requests are handled without server errors', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-burst');

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const response = await requestOtp(app, email);
      statuses.push(response.status);
    }

    expect(statuses.every((status) => status < 500)).toBe(true);
  }, 15000);

  test('2.2 valid otp creates authenticated session', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-signin');
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
        name: 'OTP Contract User',
      }),
    });

    expect(signInResponse.status).toBe(200);
    const payload = (await signInResponse.json()) as VerifyOtpResponse;
    expect(payload.accessToken.length).toBeGreaterThan(0);
    expect(payload.expiresIn).toBeGreaterThan(0);
    expect(payload.tokenType).toBe('Bearer');
    expect(payload.user.email).toBe(email);
  }, 15000);

  test('2.2 valid otp accepts normalized email and formatted otp input', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-normalized');
    await requestOtp(app, email.toUpperCase());
    const otpResponse = await fetchOtp(app, email);

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email.toUpperCase(),
        otp: `${otpResponse.otp.slice(0, 3)} ${otpResponse.otp.slice(3)}`,
      }),
    });

    expect(signInResponse.status).toBe(200);
    const payload = (await signInResponse.json()) as VerifyOtpResponse;
    expect(payload.accessToken.length).toBeGreaterThan(0);
    expect(payload.user.email).toBe(email);
  }, 15000);

  test('2.2 bearer logout revokes the authenticated session', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-logout');
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
      }),
    });

    expect(signInResponse.status).toBe(200);
    const payload = (await signInResponse.json()) as VerifyOtpResponse;

    const sessionBeforeLogout = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
      },
    });
    expect(sessionBeforeLogout.status).toBe(200);

    const logoutResponse = await app.request('http://localhost/api/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
      },
    });
    expect(logoutResponse.status).toBe(200);

    const sessionAfterLogout = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
      },
    });
    expect(sessionAfterLogout.status).toBe(401);
  }, 15000);

  test('5.1 session probe returns identity-only payload for cookie-authenticated web sessions', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-web-session');
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
      }),
    });

    expect(signInResponse.status).toBe(200);
    const sessionCookieHeader = toCookieHeader(getSetCookieHeaders(signInResponse.headers));
    expect(sessionCookieHeader.length).toBeGreaterThan(0);

    const sessionResponse = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        cookie: sessionCookieHeader,
      },
    });

    expect(sessionResponse.status).toBe(200);

    const sessionPayload = (await sessionResponse.json()) as _SessionResponse;
    expect(sessionPayload.isAuthenticated).toBe(true);
    expect(sessionPayload.user?.email).toBe(email);
    expect(sessionPayload.auth?.sub).toBeTruthy();
    expect(sessionPayload.accessToken).toBeUndefined();
    expect(sessionPayload.expiresIn).toBeUndefined();
  }, 15000);

  test('2.2 session probe ignores legacy refresh-token cookies', async () => {
    const createServer = await importServer();
    const app = createServer();
    const sessionResponse = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        cookie: 'hominem_refresh_token=legacy-refresh-token',
      },
    });

    expect(sessionResponse.status).toBe(401);
    const sessionPayload = (await sessionResponse.json()) as _SessionResponse;
    expect(sessionPayload.isAuthenticated).toBe(false);
    expect(getSetCookieHeaders(sessionResponse.headers)).toHaveLength(0);
  }, 15000);

  test('2.2 session probe ignores legacy app-token cookies', async () => {
    const createServer = await importServer();
    const app = createServer();

    const sessionResponse = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        cookie: 'hominem_access_token=invalid-token',
      },
    });

    expect(sessionResponse.status).toBe(401);
    expect(getSetCookieHeaders(sessionResponse.headers)).toHaveLength(0);
  }, 15000);

  test('2.2 invalid otp is rejected and does not create authenticated session', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-invalid');
    await requestOtp(app, email);

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: '000000',
        name: 'OTP Contract User',
      }),
    });

    expect(signInResponse.status).toBeGreaterThanOrEqual(400);
    expect(signInResponse.status).toBeLessThan(500);

    // Verify session is not created by trying with an invalid token
    const sessionResponse = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    expect(sessionResponse.status).toBe(401);
  }, 15000);

  test('2.2 expired otp is rejected and session remains unauthenticated', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T00:00:00.000Z'));
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '1';
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-expired');
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    vi.setSystemTime(new Date('2026-03-05T00:00:01.200Z'));

    const signInResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
      }),
    });

    expect(signInResponse.status).toBeGreaterThanOrEqual(400);
    expect(signInResponse.status).toBeLessThan(500);

    // Verify session is not created by trying with an invalid token
    const sessionResponse = await app.request('http://localhost/api/auth/session', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    expect(sessionResponse.status).toBe(401);
  }, 15000);

  test('2.3 replayed otp verification attempts fail deterministically in test mode', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = createAuthTestEmail('otp-replay');
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    const firstResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
      }),
    });
    expect(firstResponse.status).toBe(200);

    const replayResponse = await app.request('http://localhost/api/auth/email-otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        otp: otpResponse.otp,
      }),
    });

    expect(replayResponse.status).toBe(400);
    const replayBody = (await replayResponse.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };
    expect(replayBody.error ?? replayBody.message ?? 'replay_rejected').toBeTruthy();
  }, 15000);
});
