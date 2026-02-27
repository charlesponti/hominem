import { beforeEach, describe, expect, test, vi } from 'vitest';

const rateCounterStore = vi.hoisted(() => new Map<string, number>());

const rotateRefreshTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../auth/session-store', async () => {
  const actual =
    await vi.importActual<typeof import('../auth/session-store')>('../auth/session-store');
  return {
    ...actual,
    rotateRefreshToken: rotateRefreshTokenMock,
  };
});

vi.mock('@hominem/services/redis', () => ({
  redis: {
    on: vi.fn(),
    incr: vi.fn(async (key: string) => {
      const next = (rateCounterStore.get(key) ?? 0) + 1;
      rateCounterStore.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  },
}));

import { createServer } from '../server';

describe('auth route rate limiting', () => {
  beforeEach(() => {
    rateCounterStore.clear();
    rotateRefreshTokenMock.mockReset();
    rotateRefreshTokenMock.mockResolvedValue({
      ok: true,
      accessToken: 'access-refresh',
      refreshToken: 'refresh-next',
      tokenType: 'Bearer',
      expiresIn: 600,
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      refreshFamilyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
  });

  test('throttles repeated /api/auth/token refresh attempts from same client key', async () => {
    const app = createServer();

    const requestToken = async () => {
      return app.request('http://localhost/api/auth/token', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.25',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'refresh-token-for-rate-limit-test-12345',
        }),
      });
    };

    const first = await requestToken();
    expect(first.status).toBe(200);

    const limitHeader = first.headers.get('X-RateLimit-Limit');
    expect(limitHeader).toBeTruthy();
    const rateLimit = Number.parseInt(limitHeader ?? '0', 10);
    expect(rateLimit).toBeGreaterThan(1);

    let finalResponse: Response | null = null;
    for (let attempt = 1; attempt <= rateLimit; attempt += 1) {
      const response = await requestToken();
      finalResponse = response;
      if (attempt < rateLimit) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429);
      }
    }

    if (!finalResponse) {
      throw new Error('Expected final response to be set');
    }

    const finalBody = (await finalResponse.json()) as { error: string };
    expect(finalBody.error).toBe('rate_limit_exceeded');
  });
});
