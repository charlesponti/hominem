import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const loadTokensMock = mock();
const saveTokensMock = mock();
const clearTokensMock = mock();
const openMock = mock();
const getPortMock = mock();

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
  let fetchMock: ReturnType<typeof mock>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    loadTokensMock.mockReset();
    saveTokensMock.mockReset();
    clearTokensMock.mockReset();
    openMock.mockReset();
    openMock.mockResolvedValue(undefined);
    getPortMock.mockReset();
    getPortMock.mockResolvedValue(39217);

    // Mock global fetch
    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
      issuerBaseUrl: 'http://localhost:4040',
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'fresh-access',
        refresh_token: 'refresh-token-2',
        token_type: 'Bearer',
        expires_in: 600,
        scope: 'cli:read cli:write',
        provider: 'better-auth',
        session_id: '33333333-3333-4333-8333-333333333333',
        refresh_family_id: '44444444-4444-4444-8444-444444444444',
      }),
    } as Response);

    const token = await getAccessToken();

    expect(token).toBe('fresh-access');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4040/api/auth/token',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('refresh_token'),
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
        issuerBaseUrl: 'http://localhost:4040',
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
      issuerBaseUrl: 'http://localhost:4040',
    });

    await expect(
      getAccessToken({
        expectedIssuerBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toThrow('does not match requested base');
  });

  test('getAccessToken does not return stale token when refresh fails', async () => {
    loadTokensMock.mockResolvedValueOnce({
      tokenVersion: 2,
      accessToken: 'stale',
      refreshToken: 'refresh-1',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      issuerBaseUrl: 'http://localhost:4040',
    });

    fetchMock.mockImplementationOnce(async () => {
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
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        device_code: 'device-code-1',
        user_code: 'ABCD-1234',
        verification_uri: 'https://example.test/activate',
        expires_in: 0,
        interval: 1,
      }),
    } as Response);

    await expect(
      interactiveLogin({
        authBaseUrl: 'http://localhost:4040',
      outputMode: 'machine',
      timeoutMs: 10,
    }),
    ).rejects.toThrow('timed out');
  });
});
