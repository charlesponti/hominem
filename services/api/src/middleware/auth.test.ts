import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyAccessToken: vi.fn(),
  isSessionRevoked: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock('../auth/tokens', () => ({
  verifyAccessToken: mocks.verifyAccessToken,
}));

vi.mock('../auth/session-store', () => ({
  isSessionRevoked: mocks.isSessionRevoked,
}));

vi.mock('@hominem/auth/server', () => ({
  toUser: (input: {
    id: string;
    email: string;
    is_admin?: boolean;
    created_at?: string;
    updated_at?: string;
  }) => ({
    id: input.id,
    email: input.email,
    isAdmin: input.is_admin ?? false,
    ...(input.created_at ? { createdAt: input.created_at } : {}),
    ...(input.updated_at ? { updatedAt: input.updated_at } : {}),
  }),
  UserAuthService: {
    getUserById: mocks.getUserById,
  },
}));

import { authJwtMiddleware } from './auth';

function createApp() {
  return new Hono().use('*', authJwtMiddleware()).get('/protected', (c) => {
    return c.json({
      userId: c.get('userId') ?? null,
      auth: c.get('auth') ?? null,
    });
  });
}

describe('authJwtMiddleware', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.verifyAccessToken.mockReset();
    mocks.isSessionRevoked.mockReset();
    mocks.getUserById.mockReset();
  });

  test('authenticates Better Auth bearer tokens before legacy JWT validation', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: {
        id: 'better-user',
      },
      session: {
        id: 'better-session',
      },
    });
    mocks.verifyAccessToken.mockRejectedValueOnce(new Error('invalid_token'));
    mocks.getUserById.mockResolvedValueOnce({
      id: 'better-user',
      email: 'better@hominem.test',
      is_admin: false,
    });

    const app = createApp();
    const response = await app.request('http://localhost/protected', {
      headers: {
        authorization: 'Bearer better-auth-token',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: 'better-user',
      auth: {
        sid: 'better-session',
        amr: ['better-auth-session'],
      },
    });
  });

  test('falls back to legacy JWT auth when Better Auth bearer resolution does not authenticate', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    mocks.verifyAccessToken.mockResolvedValueOnce({
      sub: 'legacy-user',
      sid: 'legacy-session',
      scope: ['api:read'],
      role: 'user',
      amr: ['dev'],
      auth_time: 1,
    });
    mocks.isSessionRevoked.mockResolvedValueOnce(false);
    mocks.getUserById.mockResolvedValueOnce({
      id: 'legacy-user',
      email: 'legacy@hominem.test',
      is_admin: false,
    });

    const app = createApp();
    const response = await app.request('http://localhost/protected', {
      headers: {
        authorization: 'Bearer legacy-jwt-token',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: 'legacy-user',
      auth: {
        sid: 'legacy-session',
        amr: ['dev'],
      },
    });
  });

  test('returns 401 only when both Better Auth and legacy JWT auth fail', async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    mocks.verifyAccessToken.mockRejectedValueOnce(new Error('invalid_token'));

    const app = createApp();
    const response = await app.request('http://localhost/protected', {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'invalid_token',
    });
  });
});
