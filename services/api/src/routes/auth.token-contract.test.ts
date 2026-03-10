import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockRotateRefreshToken = vi.hoisted(() => vi.fn());

vi.mock('../auth/session-store', async () => {
  const actual =
    await vi.importActual<typeof import('../auth/session-store')>('../auth/session-store');
  return {
    ...actual,
    rotateRefreshToken: mockRotateRefreshToken,
  };
});

import { createServer } from '../server';

describe('auth token response contract', () => {
  beforeEach(() => {
    mockRotateRefreshToken.mockReset();
  });

  test('POST /api/auth/token returns provider + session/family metadata for refresh grant', async () => {
    mockRotateRefreshToken.mockResolvedValueOnce({
      ok: true,
      accessToken: 'access-contract-token',
      refreshToken: 'refresh-contract-token',
      tokenType: 'Bearer',
      expiresIn: 600,
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      refreshFamilyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    const app = createServer();
    const response = await app.request('http://localhost/api/auth/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: 'test-refresh-token',
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      session_id: string;
      refresh_family_id: string;
      provider: string;
    };

    expect(body.access_token).toBe('access-contract-token');
    expect(body.refresh_token).toBe('refresh-contract-token');
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBe(600);
    expect(body.session_id).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(body.refresh_family_id).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    expect(body.provider).toBe('better-auth');
  });

  test('POST /api/auth/token rejects non-refresh grants', async () => {
    const app = createServer();
    const response = await app.request('http://localhost/api/auth/token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'ignored',
      }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe('unsupported_grant_type');
  });

  test('POST /api/auth/refresh accepts camelCase refresh token input', async () => {
    mockRotateRefreshToken.mockResolvedValueOnce({
      ok: true,
      accessToken: 'access-refresh-token',
      refreshToken: 'refresh-next-token',
      tokenType: 'Bearer',
      expiresIn: 600,
      sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      refreshFamilyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });

    const app = createServer();
    const response = await app.request('http://localhost/api/auth/refresh', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: 'test-refresh-token',
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
    };

    expect(body.accessToken).toBe('access-refresh-token');
    expect(body.refreshToken).toBe('refresh-next-token');
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe(600);
  });
});
