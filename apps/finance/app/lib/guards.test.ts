import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetServerAuth } = vi.hoisted(() => ({
  mockGetServerAuth: vi.fn(),
}));

vi.mock('./auth.server', () => ({
  getServerAuth: mockGetServerAuth,
}));

vi.mock('./env.server', () => ({
  serverEnv: {
    HOMINEM_INTERNAL_API_URL: 'http://localhost:4040',
    PUBLIC_APP_URL: 'http://localhost:4444',
    VITE_PUBLIC_API_URL: 'http://localhost:4040',
  },
}));

import { requireAuth } from './guards';

describe('requireAuth', () => {
  beforeEach(() => {
    mockGetServerAuth.mockReset();
  });

  it('allows cookie-authenticated users without a bearer session', async () => {
    const headers = new Headers([['set-cookie', 'session=abc']]);

    mockGetServerAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'finance@hominem.test' },
      headers,
    });

    await expect(requireAuth(new Request('http://localhost:4444/finance'))).resolves.toEqual({
      user: { id: 'user-1', email: 'finance@hominem.test' },
      headers,
    });
  });

  it('redirects unauthenticated users to auth', async () => {
    mockGetServerAuth.mockResolvedValue({
      user: null,
      headers: new Headers(),
    });

    await expect(
      requireAuth(new Request('http://localhost:4444/finance?view=month')),
    ).rejects.toMatchObject({
      status: 302,
      headers: expect.objectContaining({
        get: expect.any(Function),
      }),
    });

    await requireAuth(new Request('http://localhost:4444/finance?view=month')).catch(
      (response: Response) => {
        expect(response.headers.get('Location')).toBe(
          'http://localhost:4040/login?next=http%3A%2F%2Flocalhost%3A4444%2Ffinance%3Fview%3Dmonth',
        );
      },
    );
  });
});
