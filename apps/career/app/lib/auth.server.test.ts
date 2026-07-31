// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env.server', () => ({
  serverEnv: { VITE_PUBLIC_API_URL: 'http://localhost:3000' },
}));

import { getServerSession } from './auth.server';

const sessionPayload = {
  session: { id: 'session-123' },
  user: {
    id: 'auth-user-id',
    email: 'user@example.com',
    emailVerified: true,
    name: 'Test User',
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('career auth server helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the current session from Better Auth directly', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(sessionPayload));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getServerSession(
      new Request('http://localhost/account', {
        headers: { cookie: 'better-auth.session_token=session-token' },
      }),
    );

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    if (!(init?.headers instanceof Headers)) throw new Error('expected fetch Headers');

    expect(String(url)).toMatch(/\/api\/auth\/get-session$/);
    expect(init.method).toBe('GET');
    expect(init.headers.get('cookie')).toBe('better-auth.session_token=session-token');
    expect(result.user?.id).toBe('auth-user-id');
    expect(result.headers).toBeInstanceOf(Headers);
  });

  it('returns null auth data when Better Auth has no session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(null)),
    );

    await expect(getServerSession(new Request('http://localhost/'))).resolves.toEqual({
      user: null,
      headers: expect.any(Headers),
    });
  });

  it('returns null auth data when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    await expect(getServerSession(new Request('http://localhost/'))).resolves.toEqual({
      user: null,
      headers: expect.any(Headers),
    });
  });
});
