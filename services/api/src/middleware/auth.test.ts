import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock('@hominem/auth/server', () => ({
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
    mocks.getUserById.mockReset();
  });

  test('authenticates Better Auth sessions', async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: {
        id: 'better-user',
      },
      session: {
        id: 'better-session',
      },
    });
    mocks.getUserById.mockResolvedValueOnce({
      id: 'better-user',
      email: 'better@example.com',
      createdAt: '2026-03-10T12:00:00.000Z',
      updatedAt: '2026-03-10T12:00:00.000Z',
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

  test('returns 401 when Better Auth session is missing', async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    const app = createApp();
    const response = await app.request('http://localhost/protected', {
      headers: {
        authorization: 'Bearer legacy-jwt-token',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: null,
      auth: null,
    });
  });

  test('leaves the request unauthenticated for invalid bearer tokens', async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    const app = createApp();
    const response = await app.request('http://localhost/protected', {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      userId: null,
      auth: null,
    });
  });
});
