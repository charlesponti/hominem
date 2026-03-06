import { describe, expect, it } from 'vitest'

import { parseMobileAuthCallback } from '../utils/mobile-auth-callback'

describe('parseMobileAuthCallback', () => {
  const expectedRedirectUri = 'hakumi-e2e://auth/callback'
  const expectedState = 'state-123'

  it('parses code when callback is valid', () => {
    const callbackUrl = `${expectedRedirectUri}?state=${expectedState}&code=auth-code-1`
    const parsed = parseMobileAuthCallback({
      callbackUrl,
      expectedRedirectUri,
      expectedState,
    })

    expect(parsed.code).toBe('auth-code-1')
  })

  it('rejects mismatched scheme', () => {
    expect(() =>
      parseMobileAuthCallback({
        callbackUrl: `hakumi-dev://auth/callback?state=${expectedState}&code=auth-code-1`,
        expectedRedirectUri,
        expectedState,
      }),
    ).toThrow('Invalid mobile callback scheme')
  })

  it('rejects invalid callback path', () => {
    expect(() =>
      parseMobileAuthCallback({
        callbackUrl: `hakumi-e2e://auth/wrong?state=${expectedState}&code=auth-code-1`,
        expectedRedirectUri,
        expectedState,
      }),
    ).toThrow('Invalid mobile callback path')
  })

  it('rejects oauth state mismatch', () => {
    expect(() =>
      parseMobileAuthCallback({
        callbackUrl: `${expectedRedirectUri}?state=other-state&code=auth-code-1`,
        expectedRedirectUri,
        expectedState,
      }),
    ).toThrow('OAuth state mismatch')
  })

  it('throws oauth error payload when code is absent', () => {
    expect(() =>
      parseMobileAuthCallback({
        callbackUrl: `${expectedRedirectUri}?state=${expectedState}&error=access_denied&error_description=User denied`,
        expectedRedirectUri,
        expectedState,
      }),
    ).toThrow('access_denied:User denied')
  })

  it('throws default oauth failure when code is absent and no error payload provided', () => {
    expect(() =>
      parseMobileAuthCallback({
        callbackUrl: `${expectedRedirectUri}?state=${expectedState}`,
        expectedRedirectUri,
        expectedState,
      }),
    ).toThrow('oauth_failed:Unable to complete Apple sign-in.')
  })
})
