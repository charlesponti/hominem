import { describe, expect, it } from 'vitest'

import { resolveAuthRedirect } from '../utils/navigation/auth-route-guard'

describe('resolveAuthRedirect', () => {
  it('does not redirect while booting', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'booting',
        isSignedIn: false,
        segments: ['(drawer)'],
      }),
    ).toBeNull()
  })

  it('redirects signed-out users away from protected group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_out',
        isSignedIn: false,
        segments: ['(drawer)', '(tabs)', 'start'],
      }),
    ).toBe('/(auth)')
  })

  it('redirects signed-in users away from auth group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_in',
        isSignedIn: true,
        segments: ['(auth)'],
      }),
    ).toBe('/(drawer)/(tabs)/start')
  })

  it('does not redirect signed-out users already in auth group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_out',
        isSignedIn: false,
        segments: ['(auth)'],
      }),
    ).toBeNull()
  })

  it('does not redirect signed-in users already in protected group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_in',
        isSignedIn: true,
        segments: ['(drawer)', '(tabs)', 'start'],
      }),
    ).toBeNull()
  })
})
