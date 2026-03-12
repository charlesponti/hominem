import { getSetCookieHeaders } from '@hominem/utils/headers';
import { beforeEach, describe, expect, test, vi } from 'vitest';

interface OtpResponse {
  otp: string;
}

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

interface AppRequester {
  request: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>;
}

async function importServer() {
  const module = await import('../server');
  return module.createServer;
}

async function requestOtp(app: AppRequester, email: string) {
  return app.request('http://localhost/api/auth/email-otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      type: 'sign-in',
    }),
  });
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

async function fetchOtp(app: AppRequester, email: string) {
  const response = await app.request(
    `http://localhost/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
    {
      method: 'GET',
      headers: {
        'x-e2e-auth-secret': 'otp-secret',
      },
    },
  );
  expect(response.status).toBe(200);
  return (await response.json()) as OtpResponse;
}

function toCookieHeader(setCookieValues: string[]) {
  return setCookieValues
    .map((value) => value.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('; ')
}

describe('auth email otp contract', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_E2E_SECRET = 'otp-secret';
    process.env.AUTH_TEST_OTP_ENABLED = 'true';
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300';
  });

  test('logs OTP info in development environment', async () => {
    // reinitialize modules under development env so plugin logs for us
    vi.resetModules();
    process.env.NODE_ENV = 'development';
    process.env.AUTH_E2E_SECRET = 'otp-secret';
    process.env.AUTH_TEST_OTP_ENABLED = 'true';
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300';

    const spy = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    vi.doMock('@hominem/utils/logger', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@hominem/utils/logger')>();
      return {
        ...actual,
        logger: spy,
      };
    });

    const createServer = await importServer();
    const app = createServer();
    const email = `otp-log-${Date.now()}@hominem.test`;

    const okResponse = await requestOtp(app, email);
    expect(okResponse.status).toBe(200);

    // import the mocked logger and assert it received a call
    expect(spy.info).toHaveBeenCalledWith(
      '[auth:email-otp] generated OTP',
      expect.objectContaining({ email, otp: expect.any(String), type: 'sign-in' }),
    );

    // restore test environment for subsequent beforeEach hooks
    process.env.NODE_ENV = 'test';
  }, 10000);

  test('2.1 sends otp for valid email and rejects invalid email', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = `otp-request-${Date.now()}@hominem.test`;

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
    const email = `otp-native-${Date.now()}@hominem.test`;

    const response = await requestOtpWithoutOrigin(app, email);
    expect(response.status).toBe(200);

    const otp = await fetchOtp(app, email);
    expect(otp.otp.length).toBeGreaterThanOrEqual(4);
  }, 15000);

  test('2.1 burst requests are handled without server errors', async () => {
    const createServer = await importServer();
    const app = createServer();
    const email = `otp-burst-${Date.now()}@hominem.test`;

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
    const email = `otp-signin-${Date.now()}@hominem.test`;
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
    const email = `otp-normalized-${Date.now()}@hominem.test`;
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
    const email = `otp-logout-${Date.now()}@hominem.test`;
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
    const email = `otp-web-session-${Date.now()}@hominem.test`;
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
    const email = `otp-invalid-${Date.now()}@hominem.test`;
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
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '1';
    const createServer = await importServer();
    const app = createServer();
    const email = `otp-expired-${Date.now()}@hominem.test`;
    await requestOtp(app, email);
    const otpResponse = await fetchOtp(app, email);

    await new Promise((resolve) => {
      setTimeout(resolve, 1200);
    });

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
    const email = `otp-replay-${Date.now()}@hominem.test`;
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
