import { afterEach, describe, expect, it, vi } from 'vitest';

import { bootstrapSession, signOut } from './session-client';

describe('bootstrapSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores the desktop user from an identity-only session payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          isAuthenticated: true,
          user: {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User Example',
            isAdmin: false,
            createdAt: '2026-03-10T12:00:00.000Z',
            updatedAt: '2026-03-10T12:00:00.000Z',
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const result = await bootstrapSession('http://localhost:4040');

    expect(result.user?.email).toBe('user@example.com');
    expect(result.session).toBeNull();
  });

  it('throws when desktop logout invalidation fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'upstream_failed' }), {
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    await expect(signOut('http://localhost:4040', null)).rejects.toThrow('Failed to sign out');
  });
});
