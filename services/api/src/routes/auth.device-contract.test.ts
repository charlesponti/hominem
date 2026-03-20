import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AppRequester } from './test-helpers/auth';
import {
  createAuthTestEmail,
  importServer,
  requestJson,
  signInWithEmailOtp,
} from './test-helpers/auth';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
}

let deviceAuthFlowSequence = 0;

async function createApprovedDeviceFlow(app: AppRequester) {
  deviceAuthFlowSequence += 1;
  const email = createAuthTestEmail('cli-device');
  const forwardedFor = `198.51.100.${deviceAuthFlowSequence}`;
  const { cookieHeader } = await signInWithEmailOtp(app, email);

  const codeResponse = await requestJson({
    app,
    path: '/api/auth/device/code',
    method: 'POST',
    headers: {
      'x-forwarded-for': forwardedFor,
    },
    body: {
      client_id: 'hominem-cli',
      scope: 'cli:read',
    },
  });

  expect(codeResponse.status).toBe(200);
  const deviceCode = (await codeResponse.json()) as DeviceCodeResponse;

  const verifyResponse = await requestJson({
    app,
    path: `/api/auth/device?user_code=${encodeURIComponent(deviceCode.user_code)}`,
  });

  expect(verifyResponse.status).toBe(200);
  await expect(verifyResponse.json()).resolves.toMatchObject({
    user_code: deviceCode.user_code,
    status: 'pending',
  });

  const approveResponse = await requestJson({
    app,
    path: '/api/auth/device/approve',
    method: 'POST',
    headers: {
      cookie: cookieHeader,
    },
    body: {
      userCode: deviceCode.user_code,
    },
  });

  expect(approveResponse.status).toBe(200);
  await expect(approveResponse.json()).resolves.toEqual({ success: true });

  return {
    email,
    deviceCode,
    forwardedFor,
  };
}

describe('auth device contract', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.AUTH_E2E_SECRET = 'otp-secret';
    process.env.AUTH_TEST_OTP_ENABLED = 'true';
    process.env.AUTH_EMAIL_OTP_EXPIRES_SECONDS = '300';
  });

  test('device authorization uses stable auth routes and forwards set-auth-token', async () => {
    const createServer = await importServer();
    const app = createServer();
    const { email, deviceCode, forwardedFor } = await createApprovedDeviceFlow(app);

    expect(new URL(deviceCode.verification_uri).pathname).toBe('/api/auth/device');
    expect(new URL(deviceCode.verification_uri_complete).pathname).toBe('/api/auth/device');
    expect(new URL(deviceCode.verification_uri_complete).searchParams.get('user_code')).toBe(
      deviceCode.user_code,
    );

    const tokenResponse = await requestJson({
      app,
      path: '/api/auth/device/token',
      method: 'POST',
      headers: {
        'x-forwarded-for': forwardedFor,
      },
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode.device_code,
        client_id: 'hominem-cli',
      },
    });

    expect(tokenResponse.status).toBe(200);
    const bearerToken = tokenResponse.headers.get('set-auth-token');
    expect(bearerToken).toBeTruthy();

    const sessionResponse = await requestJson({
      app,
      path: '/api/auth/session',
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
    });

    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({
      isAuthenticated: true,
      user: {
        email,
      },
    });
  }, 15_000);

  test('device approval requires an authenticated browser session', async () => {
    const createServer = await importServer();
    const app = createServer();

    const response = await requestJson({
      app,
      path: '/api/auth/device/approve',
      method: 'POST',
      body: {
        userCode: 'ABCDEFGH',
      },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'unauthorized',
    });
  });

  test('device verification requires a user_code query param', async () => {
    const createServer = await importServer();
    const app = createServer();

    const response = await requestJson({
      app,
      path: '/api/auth/device',
    });

    expect(response.status).toBe(400);
  });

  test('device token exchange still works when verify route is queried before approval', async () => {
    const createServer = await importServer();
    const app = createServer();
    const { deviceCode, forwardedFor } = await createApprovedDeviceFlow(app);

    const tokenResponse = await requestJson({
      app,
      path: '/api/auth/device/token',
      method: 'POST',
      headers: {
        'x-forwarded-for': forwardedFor,
      },
      body: {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode.device_code,
        client_id: 'hominem-cli',
      },
    });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.headers.get('set-auth-token')).toBeTruthy();
  });
});
