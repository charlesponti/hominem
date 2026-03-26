import { describe, expect, it } from 'vitest'

import { resolveAuthRedirect } from '../../utils/navigation/auth-route-guard'

describe('root auth route guard', () => {
  it('keeps the root route in place while auth is booting', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'booting',
        isSignedIn: false,
        segments: [],
      }),
    ).toBeNull()
  })

  it('routes signed-out users from the root route to auth', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_out',
        isSignedIn: false,
        segments: [],
      }),
    ).toBe('/(auth)')
  })

  it('routes signed-in users from the root route to protected start', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_in',
        isSignedIn: true,
        segments: [],
      }),
    ).toBe('/(protected)/(tabs)/start')
  })
})
