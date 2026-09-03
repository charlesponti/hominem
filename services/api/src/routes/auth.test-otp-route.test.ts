import { beforeEach, describe, expect, test } from 'vitest';

import { createServer } from '../server';
import { clearScriptedEmails, setScriptedEmailForTest } from '../testkit/resend.mock';

describe('auth test otp route', () => {
  beforeEach(() => {
    clearScriptedEmails();
  });

  test('returns latest otp with valid secret', async () => {
    setScriptedEmailForTest({
      to: 'route-test@example.com',
      subject: 'Your sign-in code',
      text: 'Your verification code is: 555111. This code will expire in 5 minutes.',
      otp: '555111',
    });

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
    setScriptedEmailForTest({
      to: 'route-test@example.com',
      subject: 'Your sign-in code',
      text: 'Your verification code is: 555111. This code will expire in 5 minutes.',
      otp: '555111',
    });

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
