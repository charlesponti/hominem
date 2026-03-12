import { describe, expect, it } from 'vitest'

import {
  expectAuthStatus,
  expectLoadingState,
  expectNoRedirect,
  expectRedirect,
} from './assertions'
import { buildAuthUser } from './fixtures'
import { createAuthIntegrationHarness } from './harness'

describe('auth flow integration', () => {
  it('requesting OTP enters loading state and does not redirect away from auth routes', () => {
    const harness = createAuthIntegrationHarness({
      status: 'signed_out',
    })

    const next = harness.dispatch({ type: 'OTP_REQUEST_STARTED' })

    expectAuthStatus(next, 'requesting_otp')
    expectLoadingState(next, true)
    expectNoRedirect(harness.resolveRoute(['(auth)']))
  })

  it('OTP request failure degrades state without redirecting protected flow until route guard re-evaluates', () => {
    const harness = createAuthIntegrationHarness({
      status: 'requesting_otp',
      isLoading: true,
    })

    const error = new Error('network unavailable')
    const next = harness.dispatch({ type: 'OTP_REQUEST_FAILED', error })

    expectAuthStatus(next, 'degraded')
    expectLoadingState(next, false)
    expect(next.error).toBe(error)
    expectNoRedirect(harness.resolveRoute(['(auth)']))
    expectRedirect(harness.resolveRoute(['(protected)', '(tabs)', 'start']), '/(auth)')
  })

  it('clearing a degraded error returns the auth experience to signed_out for retry', () => {
    const harness = createAuthIntegrationHarness({
      status: 'degraded',
      error: new Error('invalid code'),
    })

    const next = harness.dispatch({ type: 'CLEAR_ERROR' })

    expectAuthStatus(next, 'signed_out')
    expect(next.error).toBeNull()
    expectNoRedirect(harness.resolveRoute(['(auth)']))
  })

  it('passkey auth failure falls back to retryable signed_out-style auth routing', () => {
    const harness = createAuthIntegrationHarness({
      status: 'signed_out',
    })

    harness.dispatch({ type: 'PASSKEY_AUTH_STARTED' })
    const next = harness.dispatch({ type: 'PASSKEY_AUTH_FAILED', error: new Error('user cancelled') })

    expectAuthStatus(next, 'degraded')
    expectLoadingState(next, false)
    expectNoRedirect(harness.resolveRoute(['(auth)']))

    const recovered = harness.dispatch({ type: 'CLEAR_ERROR' })
    expectAuthStatus(recovered, 'signed_out')
  })

  it('refresh failure signs the user out and redirects protected routes back to auth', () => {
    const harness = createAuthIntegrationHarness({
      status: 'signed_in',
      user: buildAuthUser(),
    })

    harness.dispatch({ type: 'REFRESH_STARTED' })
    const next = harness.dispatch({ type: 'REFRESH_FAILED', error: new Error('refresh expired') })

    expectAuthStatus(next, 'signed_out')
    expectLoadingState(next, false)
    expectRedirect(harness.resolveRoute(['(protected)', '(tabs)', 'start']), '/(auth)')
  })

  it('session recovery failure enters a retryable degraded state instead of signed_out', () => {
    const harness = createAuthIntegrationHarness({
      status: 'booting',
      isLoading: true,
    })

    const next = harness.dispatch({
      type: 'SESSION_RECOVERY_FAILED',
      error: new Error('Boot timed out'),
    })

    expectAuthStatus(next, 'degraded')
    expectLoadingState(next, false)
    expectNoRedirect(harness.resolveRoute(['(auth)']))
    expectRedirect(harness.resolveRoute(['(protected)', '(tabs)', 'start']), '/(auth)')
  })

  it('profile sync keeps auth flow loading until session becomes signed in', () => {
    const harness = createAuthIntegrationHarness({
      status: 'otp_requested',
    })

    harness.dispatch({ type: 'OTP_VERIFICATION_STARTED' })
    harness.dispatch({ type: 'API_TOKEN_MINT_STARTED' })
    const syncing = harness.dispatch({ type: 'PROFILE_SYNC_STARTED' })

    expectAuthStatus(syncing, 'syncing_profile')
    expectLoadingState(syncing, true)
    expectNoRedirect(harness.resolveRoute(['(auth)']))

    const signedIn = harness.dispatch({ type: 'SESSION_LOADED', user: buildAuthUser() })
    expectAuthStatus(signedIn, 'signed_in')
    expectRedirect(harness.resolveRoute(['(auth)']), '/(protected)/(tabs)/start')
  })

  it('signing out from a protected route converges to auth without preserving stale user state', () => {
    const user = buildAuthUser()
    const harness = createAuthIntegrationHarness({
      status: 'signed_in',
      user,
    })

    const signingOut = harness.dispatch({ type: 'SIGN_OUT_REQUESTED' })
    expectAuthStatus(signingOut, 'signing_out')
    expectLoadingState(signingOut, true)

    const signedOut = harness.dispatch({ type: 'SIGN_OUT_SUCCESS' })
    expectAuthStatus(signedOut, 'signed_out')
    expect(signedOut.user).toBeNull()
    expectRedirect(harness.resolveRoute(['(protected)', '(tabs)', 'start']), '/(auth)')
  })
})
