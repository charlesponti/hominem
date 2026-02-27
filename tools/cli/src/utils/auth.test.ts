import { beforeEach, describe, expect, mock, test } from 'bun:test';

const postMock = mock();
const isAxiosErrorMock = mock(() => true);

const loadTokensMock = mock();
const saveTokensMock = mock();
const clearTokensMock = mock();
const openMock = mock();
const getPortMock = mock();

mock.module('axios', () => ({
  default: {
    post: postMock,
    isAxiosError: isAxiosErrorMock,
  },
}));

mock.module('./secure-store', () => ({
  SecureStoreError: class SecureStoreError extends Error {},
  loadTokens: loadTokensMock,
  saveTokens: saveTokensMock,
  clearTokens: clearTokensMock,
}));

mock.module('open', () => ({
  default: openMock,
}));

mock.module('get-port', () => ({
  default: getPortMock,
}));

const { deviceCodeLogin, getAccessToken, interactiveLogin } = await import('./auth');

describe('cli auth utils', () => {
  beforeEach(() => {
    postMock.mockReset();
    isAxiosErrorMock.mockReset();
    isAxiosErrorMock.mockImplementation(() => true);
    loadTokensMock.mockReset();
    saveTokensMock.mockReset();
    clearTokensMock.mockReset();
    openMock.mockReset();
    openMock.mockResolvedValue(undefined);
    getPortMock.mockReset();
    getPortMock.mockResolvedValue(39217);
  });

  test('getAccessToken refreshes expired token and persists metadata-rich response', async () => {
    loadTokensMock.mockResolvedValueOnce({
      accessToken: 'stale-access',
      refreshToken: 'refresh-token-1',
      expiresAt: new Date(Date.now() - 5_000).toISOString(),
      tokenVersion: 2,
      provider: 'better-auth',
      scopes: ['cli:read'],
      sessionId: '11111111-1111-4111-8111-111111111111',
      refreshFamilyId: '22222222-2222-4222-8222-222222222222',
      issuerBaseUrl: 'http://localhost:3000',
    });

    postMock.mockResolvedValueOnce({
      data: {
        access_token: 'fresh-access',
        refresh_token: 'refresh-token-2',
        token_type: 'Bearer',
        expires_in: 600,
        scope: 'cli:read cli:write',
        provider: 'better-auth',
        session_id: '33333333-3333-4333-8333-333333333333',
        refresh_family_id: '44444444-4444-4444-8444-444444444444',
      },
    });

    const token = await getAccessToken();

    expect(token).toBe('fresh-access');
    expect(postMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/token',
      expect.objectContaining({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-1',
      }),
    );

    expect(saveTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'fresh-access',
        refreshToken: 'refresh-token-2',
        provider: 'better-auth',
        sessionId: '33333333-3333-4333-8333-333333333333',
        refreshFamilyId: '44444444-4444-4444-8444-444444444444',
        scopes: ['cli:read', 'cli:write'],
        issuerBaseUrl: 'http://localhost:3000',
        tokenVersion: 2,
      }),
    );
  });

  test('getAccessToken throws when issuer mismatches requested base', async () => {
    loadTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      issuerBaseUrl: 'http://localhost:3000',
    });

    await expect(
      getAccessToken({
        expectedIssuerBaseUrl: 'http://localhost:4040',
      }),
    ).rejects.toThrow('does not match requested base');
  });

  test('getAccessToken does not return stale token when refresh fails', async () => {
    loadTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stale',
      refreshToken: 'refresh-1',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      issuerBaseUrl: 'http://localhost:3000',
    });

    postMock.mockImplementationOnce(async () => {
      throw new Error('network down');
    });

    try {
      await getAccessToken();
      throw new Error('expected getAccessToken to throw');
    } catch (error) {
      expect(String(error)).toContain('network down');
    }
  });

  test('interactiveLogin times out when callback never arrives', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        authorization_url: 'https://example.test/authorize',
      },
    });

    await expect(
      interactiveLogin({
        authBaseUrl: 'http://localhost:3000',
        outputMode: 'machine',
        timeoutMs: 10,
      }),
    ).rejects.toThrow('timed out');
  });
});
