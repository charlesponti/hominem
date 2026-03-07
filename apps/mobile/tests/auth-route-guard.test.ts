import { describe, expect, it } from 'vitest'

import { resolveAuthRedirect } from '../utils/navigation/auth-route-guard'

describe('resolveAuthRedirect', () => {
  it('does not redirect while booting', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'booting',
        isSignedIn: false,
        segments: ['(protected)'],
      }),
    ).toBeNull()
  })

  it('redirects signed-out users away from protected group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signed_out',
        isSignedIn: false,
        segments: ['(protected)', '(tabs)', 'start'],
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
    ).toBe('/(protected)/(tabs)/start')
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
        segments: ['(protected)', '(tabs)', 'start'],
      }),
    ).toBeNull()
  })

  it('does not redirect while signing_out — user stays in place until sign-out completes', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'signing_out',
        isSignedIn: false,
        segments: ['(protected)', '(tabs)', 'start'],
      }),
    ).toBeNull()
  })

  it.each([
    'verifying_otp',
    'minting_api_token',
    'syncing_profile',
    'requesting_otp',
  ] as const)(
    'redirects %s status on protected group to auth (in-flight auth, not yet signed in)',
    (authStatus) => {
      expect(
        resolveAuthRedirect({ authStatus, isSignedIn: false, segments: ['(protected)'] }),
      ).toBe('/(auth)')
    },
  )

  it.each(['degraded', 'terminal_error'] as const)(
    'redirects %s status on protected group to auth',
    (authStatus) => {
      expect(
        resolveAuthRedirect({ authStatus, isSignedIn: false, segments: ['(protected)'] }),
      ).toBe('/(auth)')
    },
  )

  it('does not redirect degraded status on auth group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'degraded',
        isSignedIn: false,
        segments: ['(auth)'],
      }),
    ).toBeNull()
  })

  it('does not redirect terminal_error status on auth group', () => {
    expect(
      resolveAuthRedirect({
        authStatus: 'terminal_error',
        isSignedIn: false,
        segments: ['(auth)'],
      }),
    ).toBeNull()
  })
})
