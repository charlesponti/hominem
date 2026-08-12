import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  incr: vi.fn(),
  expire: vi.fn(),
}));

vi.mock('@hominem/services/redis', () => ({ redis: mocks }));

import { authRateLimitMiddleware } from './auth-rate-limit';

function createApp() {
  return new Hono()
    .use('/api/auth/*', authRateLimitMiddleware())
    .post('/api/auth/mobile/e2e/login', (c) => c.json({ ok: true }));
}

describe('auth rate-limit middleware', () => {
  beforeEach(() => {
    mocks.incr.mockReset();
    mocks.expire.mockReset();
  });

  it('uses X-Real-IP and invokes the limiter once per request', async () => {
    mocks.incr.mockResolvedValue(1);
    const app = createApp();

    const response = await app.request('/api/auth/mobile/e2e/login', {
      method: 'POST',
      headers: {
        'x-real-ip': '198.51.100.10',
        'x-forwarded-for': '198.51.100.11',
      },
    });

    expect(response.status).toBe(200);
    expect(mocks.incr).toHaveBeenCalledOnce();
    expect(mocks.incr.mock.calls[0]?.[0]).toMatch(/^ratelimit:auth:mobile-e2e-login:[a-f0-9]{32}$/);
  });

  it('fails closed with a retry hint when Redis is unavailable', async () => {
    mocks.incr.mockRejectedValue(new Error('redis unavailable'));
    const app = createApp();

    const response = await app.request('/api/auth/mobile/e2e/login', { method: 'POST' });

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('5');
    await expect(response.json()).resolves.toMatchObject({
      error: 'rate_limit_unavailable',
      code: 'RATE_LIMIT_UNAVAILABLE',
    });
  });

  it('returns 429 after the configured limit is exceeded', async () => {
    mocks.incr.mockResolvedValue(21);
    const app = createApp();

    const response = await app.request('/api/auth/mobile/e2e/login', { method: 'POST' });

    expect(response.status).toBe(429);
    expect(response.headers.get('x-ratelimit-limit')).toBe('20');
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limit_exceeded' });
  });
});
