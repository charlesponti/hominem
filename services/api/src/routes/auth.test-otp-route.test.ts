import { beforeEach, describe, expect, test } from 'vitest';

import { clearTestOtpStore, recordTestOtp } from '../auth/test-otp-store';
import { createServer } from '../server';

describe('auth test otp route', () => {
  beforeEach(() => {
    clearTestOtpStore();
  });

  test('returns latest otp with valid secret', async () => {
    recordTestOtp({ email: 'route-test@example.com', otp: '555111', type: 'sign-in' });

    const app = createServer();
    const response = await app.request(
      'http://localhost/api/auth/test/otp/latest?email=route-test%40example.com',
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': 'otp-secret',
        },
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { otp: string; type: string };
    expect(body.otp).toBe('555111');
    expect(body.type).toBe('sign-in');
  }, 15000);

  test('returns forbidden with wrong secret', async () => {
    recordTestOtp({ email: 'route-test@example.com', otp: '555111', type: 'sign-in' });

    const app = createServer();
    const response = await app.request(
      'http://localhost/api/auth/test/otp/latest?email=route-test%40example.com',
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': 'wrong-secret',
        },
      },
    );

    expect(response.status).toBe(403);
  }, 15000);
});
