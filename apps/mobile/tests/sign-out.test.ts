import { describe, expect, it, vi } from 'vitest'

import { runSignOut } from '../utils/auth/sign-out'

describe('runSignOut', () => {
  it('falls back to local sign-out when the session cookie is missing', async () => {
    const clearLocalSession = vi.fn().mockResolvedValue(undefined)

    const result = await runSignOut({
      clearLocalSession,
      getSessionCookieHeader: () => null,
      remoteLogout: vi.fn(),
    })

    expect(result).toEqual({ type: 'LOCAL_ONLY_SIGN_OUT', error: null })
    expect(clearLocalSession).toHaveBeenCalledTimes(1)
  })

  it('falls back to local sign-out when remote logout fails', async () => {
    const clearLocalSession = vi.fn().mockResolvedValue(undefined)

    const result = await runSignOut({
      clearLocalSession,
      getSessionCookieHeader: () => 'session=abc',
      remoteLogout: vi.fn().mockRejectedValue(new Error('offline')),
    })

    expect(result.type).toBe('LOCAL_ONLY_SIGN_OUT')
    expect(result.error?.message).toBe('offline')
    expect(clearLocalSession).toHaveBeenCalledTimes(1)
  })
})
