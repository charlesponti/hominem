import { describe, expect, it } from 'vitest'

import { createAuthIntegrationHarness, createIntegrationQueryClient } from './harness'
import { buildAuthUser } from './fixtures'
import {
  expectAuthStatus,
  expectLoadingState,
  expectNoRedirect,
  expectRedirect,
  expectRetryDelayWithinBackoff,
} from './assertions'

describe('auth contract integration', () => {
  it('boot resolves to signed_out when no session exists', () => {
    const harness = createAuthIntegrationHarness()

    const next = harness.dispatch({ type: 'SESSION_EXPIRED' })

    expectAuthStatus(next, 'signed_out')
    expectNoRedirect(harness.resolveRoute(['(auth)']))
  })

  it('boot resolves to signed_in when valid session exists', () => {
    const harness = createAuthIntegrationHarness()
    const user = buildAuthUser()

    const next = harness.dispatch({ type: 'SESSION_LOADED', user })

    expectAuthStatus(next, 'signed_in')
    expectNoRedirect(harness.resolveRoute(['(drawer)', '(tabs)', 'start']))
  })

  it('concurrent sign-in events converge to a stable signed_in state', () => {
    const harness = createAuthIntegrationHarness({
      status: 'signed_out',
    })
    const user = buildAuthUser()

    harness.dispatch({ type: 'OTP_VERIFICATION_STARTED' })
    harness.dispatch({ type: 'OTP_VERIFICATION_STARTED' })
    const finalState = harness.dispatch({ type: 'SESSION_LOADED', user })

    expectAuthStatus(finalState, 'signed_in')
    expectLoadingState(finalState, false)
    expect(finalState.user?.id).toBe(user.id)
  })

  it('sign-out requested during in-flight auth resolves deterministically to signed_out', () => {
    const harness = createAuthIntegrationHarness({
      status: 'otp_requested',
    })

    harness.dispatch({ type: 'OTP_VERIFICATION_STARTED' })
    harness.dispatch({ type: 'SIGN_OUT_REQUESTED' })
    const finalState = harness.dispatch({ type: 'SIGN_OUT_SUCCESS' })

    expectAuthStatus(finalState, 'signed_out')
    expect(finalState.user).toBeNull()
    expectNoRedirect(harness.resolveRoute(['(auth)']))
  })

  it('deep link to protected route during boot does not redirect-loop and converges after session resolve', () => {
    const signedOutHarness = createAuthIntegrationHarness()
    expectNoRedirect(signedOutHarness.resolveRoute(['(drawer)', '(tabs)', 'start']))

    signedOutHarness.dispatch({ type: 'SESSION_EXPIRED' })
    expectRedirect(signedOutHarness.resolveRoute(['(drawer)', '(tabs)', 'start']), '/(auth)')

    const signedInHarness = createAuthIntegrationHarness()
    expectNoRedirect(signedInHarness.resolveRoute(['(drawer)', '(tabs)', 'start']))

    signedInHarness.dispatch({ type: 'SESSION_LOADED', user: buildAuthUser() })
    expectNoRedirect(signedInHarness.resolveRoute(['(drawer)', '(tabs)', 'start']))
  })

  it('guarded navigation transitions are idempotent', () => {
    const signedOutHarness = createAuthIntegrationHarness({
      status: 'signed_out',
    })
    expectRedirect(signedOutHarness.resolveRoute(['(drawer)', '(tabs)', 'start']), '/(auth)')
    expectRedirect(signedOutHarness.resolveRoute(['(drawer)', '(tabs)', 'start']), '/(auth)')

    const signedInHarness = createAuthIntegrationHarness({
      status: 'signed_in',
      user: buildAuthUser(),
    })
    expectRedirect(signedInHarness.resolveRoute(['(auth)']), '/(drawer)/(tabs)/start')
    expectRedirect(signedInHarness.resolveRoute(['(auth)']), '/(drawer)/(tabs)/start')
  })

  it('query retry backoff remains bounded for deterministic tests', () => {
    createIntegrationQueryClient()
    expectRetryDelayWithinBackoff(0)
    expectRetryDelayWithinBackoff(500)
    expectRetryDelayWithinBackoff(30_000)
  })
})
