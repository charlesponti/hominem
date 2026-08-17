import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  executeTakeFirst: vi.fn(),
}));

vi.mock('@hominem/db', () => ({
  authDb: {
    selectFrom: vi.fn(() => ({
      selectAll: vi.fn(() => ({
        where: vi.fn(() => ({ executeTakeFirst: mocks.executeTakeFirst })),
      })),
    })),
  },
}));

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: { api: { getSession: mocks.getSession } },
}));

import type { AuthContext } from '../auth/types';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'auth@example.com',
  emailVerified: true,
  name: 'Auth Test User',
  image: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// The auth middleware reads env fields once at import time (validated,
// process-wide config), so vi.stubEnv after import has no effect. Re-mock
// the ../env module and re-import fresh per test to exercise different
// NODE_ENV / AUTH_E2E_* combinations.
async function createApp(envOverrides: Record<string, string | boolean> = {}) {
  vi.resetModules();
  vi.doMock('../env', async () => {
    const actual = await vi.importActual<typeof import('../env')>('../env');
    return { env: { ...actual.env, ...envOverrides } };
  });

  const { authMiddleware } = await import('./auth');

  return new Hono().use('*', authMiddleware()).get('*', (c) => c.json(c.get('auth') ?? null));
}

describe('auth middleware', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.executeTakeFirst.mockReset();
    mocks.executeTakeFirst.mockResolvedValue(user);
  });

  it('resolves a normal Better Auth session without granting MCP scopes', async () => {
    mocks.getSession.mockResolvedValue({
      user,
      session: { id: 'session-123' },
    });

    const app = await createApp();
    const response = await app.request('/api/mcp', {
      headers: { 'x-mcp-scopes': 'admin:write' },
    });
    const auth = (await response.json()) as AuthContext;

    expect(auth).toMatchObject({
      userId: user.id,
      sessionId: 'session-123',
      credential: 'session',
      scopes: [],
    });
  });

  it('adapts verified JWT claims into the MCP auth context', async () => {
    vi.resetModules();
    const { setMcpAuthContext } = await import('./auth');
    const contextApp = new Hono().get('*', async (c) => {
      const resolved = await setMcpAuthContext(c, {
        sub: user.id,
        client_id: 'client-1',
        scope: 'career:read',
      });
      return c.json({ resolved, auth: c.get('auth') });
    });
    const response = await contextApp.request('/api/mcp');
    const body = (await response.json()) as { auth: AuthContext; resolved: boolean };

    expect(body.resolved).toBe(true);
    expect(body.auth).toMatchObject({
      userId: user.id,
      credential: 'mcp-oauth',
      scopes: ['career:read'],
    });
    expect(body.auth.clientId).toBe('client-1');
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('does not treat an unrecognized bearer token as a Better Auth session', async () => {
    mocks.getSession.mockResolvedValue(null);

    const app = await createApp();
    const response = await app.request('/api/mcp', {
      headers: { authorization: 'Bearer better-auth-session-token' },
    });
    const auth = await response.json();

    expect(auth).toBeNull();
    expect(mocks.getSession).toHaveBeenCalledOnce();
  });
});
