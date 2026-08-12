import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ checkRateLimit: vi.fn() }));

vi.mock('./rate-limiter', () => ({ checkRateLimit: mocks.checkRateLimit }));

import type { AuthContext } from '../auth/types';

const auth = {
  user: { id: 'user-1' },
  userId: 'user-1',
  credential: 'mcp-oauth',
  scopes: ['career:read'],
} as AuthContext;

async function createApp() {
  vi.resetModules();
  vi.doMock('../env', async () => {
    const actual = await vi.importActual<typeof import('../env')>('../env');
    return { env: { ...actual.env, NODE_ENV: 'production' } };
  });

  const { mcpAuthorizationMiddleware } = await import('./routes');
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    return mcpAuthorizationMiddleware(c as never, next as never);
  });
  app.get('*', (c) => c.json({ ok: true }));
  return app;
}

describe('MCP rate-limit route behavior', () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockReset();
  });

  it('fails closed with 503 when Redis is unavailable', async () => {
    mocks.checkRateLimit.mockResolvedValue('unavailable');
    const app = await createApp();
    const response = await app.request('/api/mcp');

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('5');
    await expect(response.json()).resolves.toMatchObject({
      error: 'rate_limit_unavailable',
      code: 'RATE_LIMIT_UNAVAILABLE',
    });
  });

  it('preserves 429 when the MCP quota is exceeded', async () => {
    mocks.checkRateLimit.mockResolvedValue('limited');
    const app = await createApp();
    const response = await app.request('/api/mcp');

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ error: 'rate_limited' });
  });
});
