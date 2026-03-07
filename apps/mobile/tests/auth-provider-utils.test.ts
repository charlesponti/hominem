import { describe, expect, it } from 'vitest'

import { resolveIsLoadingAuth } from '../utils/auth/provider-utils'

describe('resolveIsLoadingAuth', () => {
  it('is true while booting', () => {
    expect(
      resolveIsLoadingAuth({ status: 'booting', user: null, error: null, isLoading: false }),
    ).toBe(true)
  })

  it('is true while explicit loading flag is set', () => {
    expect(
      resolveIsLoadingAuth({ status: 'signed_out', user: null, error: null, isLoading: true }),
    ).toBe(true)
  })

  it('is false when not booting and not loading', () => {
    expect(
      resolveIsLoadingAuth({
        status: 'signed_in',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        error: null,
        isLoading: false,
      }),
    ).toBe(false)
  })
})
