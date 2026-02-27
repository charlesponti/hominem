import { describe, expect, test } from 'bun:test'

import { extractSuccessfulAuthCallbackUrl } from './auth-provider-result'

describe('extractSuccessfulAuthCallbackUrl', () => {
  test('returns callback URL for successful browser result', () => {
    const callbackUrl = extractSuccessfulAuthCallbackUrl({
      type: 'success',
      url: 'mindsherpa://auth/callback?state=abc&code=token',
    })

    expect(callbackUrl).toBe('mindsherpa://auth/callback?state=abc&code=token')
  })

  test('throws cancellable error on cancel or dismiss', () => {
    try {
      extractSuccessfulAuthCallbackUrl({ type: 'cancel' })
      throw new Error('expected cancellation error')
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }
      expect(error.name).toBe('ERR_REQUEST_CANCELED')
      expect(error.message).toBe('OAuth sign-in cancelled')
    }

    try {
      extractSuccessfulAuthCallbackUrl({ type: 'dismiss' })
      throw new Error('expected dismissal error')
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }
      expect(error.name).toBe('ERR_REQUEST_CANCELED')
    }
  })

  test('throws failure for non-success result without callback URL', () => {
    expect(() => extractSuccessfulAuthCallbackUrl({ type: 'opened' })).toThrow('OAuth sign-in failed')
  })
})
