import { beforeEach, describe, expect, test, vi } from 'vitest'

const postMock = vi.fn()
const isAxiosErrorMock = vi.fn((error: unknown) =>
  Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
)

const loadTokensMock = vi.fn()
const saveTokensMock = vi.fn()
const clearTokensMock = vi.fn()

vi.mock('axios', () => ({
  default: {
    post: postMock,
    isAxiosError: isAxiosErrorMock,
  },
}))

vi.mock('./secure-store', () => ({
  loadTokens: loadTokensMock,
  saveTokens: saveTokensMock,
  clearTokens: clearTokensMock,
}))

import { deviceCodeLogin, getAccessToken } from './auth'

describe('cli auth utils', () => {
  beforeEach(() => {
    postMock.mockReset()
    isAxiosErrorMock.mockReset()
    isAxiosErrorMock.mockImplementation((error: unknown) =>
      Boolean((error as { isAxiosError?: boolean })?.isAxiosError),
    )
    loadTokensMock.mockReset()
    saveTokensMock.mockReset()
    clearTokensMock.mockReset()
  })

  test('getAccessToken refreshes expired token and persists metadata-rich response', async () => {
    loadTokensMock.mockResolvedValueOnce({
      accessToken: 'stale-access',
      refreshToken: 'refresh-token-1',
      expiresAt: new Date(Date.now() - 5_000).toISOString(),
      provider: 'better-auth',
      scopes: ['cli:read'],
      sessionId: '11111111-1111-4111-8111-111111111111',
      refreshFamilyId: '22222222-2222-4222-8222-222222222222',
    })

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
    })

    const token = await getAccessToken()

    expect(token).toBe('fresh-access')
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/token'),
      expect.objectContaining({
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-1',
      }),
    )

    expect(saveTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'fresh-access',
        refreshToken: 'refresh-token-2',
        provider: 'better-auth',
        sessionId: '33333333-3333-4333-8333-333333333333',
        refreshFamilyId: '44444444-4444-4444-8444-444444444444',
        scopes: ['cli:read', 'cli:write'],
      }),
    )
  })

  test('deviceCodeLogin handles authorization_pending and eventually stores tokens', async () => {
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((handler: TimerHandler) => {
        if (typeof handler === 'function') {
          handler()
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      }) as unknown as typeof setTimeout)

    postMock
      .mockResolvedValueOnce({
        data: {
          device_code: 'device-code-1',
          user_code: 'ABCD-EFGH',
          verification_uri: 'https://example.test/device',
          interval: 0,
          expires_in: 600,
        },
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error: 'authorization_pending',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'device-access-token',
          refresh_token: 'device-refresh-token',
          expires_in: 600,
          scope: 'cli:read',
          provider: 'better-auth',
          session_id: '55555555-5555-4555-8555-555555555555',
          refresh_family_id: '66666666-6666-4666-8666-666666666666',
        },
      })

    await deviceCodeLogin({
      authBaseUrl: 'http://localhost:3000',
      scopes: ['cli:read'],
      headless: true,
    })

    expect(postMock).toHaveBeenCalledTimes(3)
    expect(saveTokensMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'device-access-token',
        refreshToken: 'device-refresh-token',
        sessionId: '55555555-5555-4555-8555-555555555555',
        refreshFamilyId: '66666666-6666-4666-8666-666666666666',
      }),
    )

    setTimeoutSpy.mockRestore()
  })

  test('deviceCodeLogin throws on expired_token polling response', async () => {
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((handler: TimerHandler) => {
        if (typeof handler === 'function') {
          handler()
        }
        return 0 as unknown as ReturnType<typeof setTimeout>
      }) as unknown as typeof setTimeout)

    postMock
      .mockResolvedValueOnce({
        data: {
          device_code: 'device-code-2',
          user_code: 'IJKL-MNOP',
          verification_uri: 'https://example.test/device',
          interval: 0,
          expires_in: 600,
        },
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error: 'expired_token',
          },
        },
      })

    await expect(
      deviceCodeLogin({
        authBaseUrl: 'http://localhost:3000',
        headless: true,
      }),
    ).rejects.toThrow('Device code expired before authorization completed')

    setTimeoutSpy.mockRestore()
  })
})
