import { describe, expect, it, vi } from 'vitest'

import { runAuthBoot, type AuthBootDeps } from '../utils/auth/boot'

const testUser = { id: 'u1', email: 'test@example.com', name: 'Test User' }
const testProfile = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function makeDeps(overrides: Partial<AuthBootDeps> = {}): AuthBootDeps {
  return {
    getStoredTokens: vi.fn().mockResolvedValue({
      accessToken: null,
      refreshToken: null,
      expiresAtStr: null,
    }),
    probeSession: vi.fn().mockResolvedValue(null),
    clearTokens: vi.fn().mockResolvedValue(undefined),
    upsertProfile: vi.fn().mockResolvedValue(testProfile),
    clearLegacyData: vi.fn().mockResolvedValue(undefined),
    signal: new AbortController().signal,
    ...overrides,
  }
}

describe('runAuthBoot', () => {
  it('returns SESSION_EXPIRED when no stored token exists', async () => {
    const deps = makeDeps()

    const result = await runAuthBoot(deps)

    expect(result.type).toBe('SESSION_EXPIRED')
    expect(deps.probeSession).not.toHaveBeenCalled()
    expect(deps.clearTokens).not.toHaveBeenCalled()
    expect(deps.upsertProfile).not.toHaveBeenCalled()
  })

  it('returns SESSION_LOADED when stored token passes session probe', async () => {
    const deps = makeDeps({
      getStoredTokens: vi.fn().mockResolvedValue({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh',
        expiresAtStr: '9999999999000',
      }),
      probeSession: vi.fn().mockResolvedValue(testUser),
    })

    const result = await runAuthBoot(deps)

    expect(result.type).toBe('SESSION_LOADED')
    if (result.type === 'SESSION_LOADED') {
      expect(result.user.id).toBe('u1')
      expect(result.tokens.accessToken).toBe('valid-token')
      expect(result.tokens.refreshToken).toBe('valid-refresh')
      expect(result.tokens.expiresAtStr).toBe('9999999999000')
    }
    expect(deps.clearTokens).not.toHaveBeenCalled()
  })

  it('clears tokens and returns SESSION_EXPIRED when probe returns null (401)', async () => {
    const deps = makeDeps({
      getStoredTokens: vi.fn().mockResolvedValue({
        accessToken: 'expired-token',
        refreshToken: 'r',
        expiresAtStr: null,
      }),
      probeSession: vi.fn().mockResolvedValue(null),
      clearTokens: vi.fn().mockResolvedValue(undefined),
    })

    const result = await runAuthBoot(deps)

    expect(result.type).toBe('SESSION_EXPIRED')
    expect(deps.clearTokens).toHaveBeenCalledTimes(1)
    expect(deps.upsertProfile).not.toHaveBeenCalled()
  })

  it('propagates network errors without clearing tokens', async () => {
    const deps = makeDeps({
      getStoredTokens: vi.fn().mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'r',
        expiresAtStr: null,
      }),
      probeSession: vi.fn().mockRejectedValue(new TypeError('network unavailable')),
    })

    await expect(runAuthBoot(deps)).rejects.toThrow('network unavailable')
    expect(deps.clearTokens).not.toHaveBeenCalled()
  })

  it('propagates AbortError on timeout without clearing tokens', async () => {
    const controller = new AbortController()
    const deps = makeDeps({
      getStoredTokens: vi.fn().mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'r',
        expiresAtStr: null,
      }),
      probeSession: vi.fn().mockImplementation(() => {
        controller.abort()
        return Promise.reject(new DOMException('Boot timed out', 'AbortError'))
      }),
      signal: controller.signal,
    })

    await expect(runAuthBoot(deps)).rejects.toThrow('Boot timed out')
    expect(deps.clearTokens).not.toHaveBeenCalled()
  })

  it('passes the AbortSignal to probeSession', async () => {
    const controller = new AbortController()
    const deps = makeDeps({
      getStoredTokens: vi.fn().mockResolvedValue({
        accessToken: 'token',
        refreshToken: null,
        expiresAtStr: null,
      }),
      probeSession: vi.fn().mockResolvedValue(testUser),
      signal: controller.signal,
    })

    await runAuthBoot(deps)

    expect(deps.probeSession).toHaveBeenCalledWith('token', controller.signal)
  })

  it('runs clearLegacyData before reading tokens', async () => {
    const callOrder: string[] = []
    const deps = makeDeps({
      clearLegacyData: vi.fn().mockImplementation(() => {
        callOrder.push('clearLegacyData')
        return Promise.resolve()
      }),
      getStoredTokens: vi.fn().mockImplementation(() => {
        callOrder.push('getStoredTokens')
        return Promise.resolve({ accessToken: null, refreshToken: null, expiresAtStr: null })
      }),
    })

    await runAuthBoot(deps)

    expect(callOrder).toEqual(['clearLegacyData', 'getStoredTokens'])
  })
})
