import { describe, expect, it } from 'vitest'

import { AUTH_CALLBACK_ERROR, buildAuthCallbackErrorRedirect, readAuthErrorMessage } from './auth-error-contract'

describe('auth error contract helpers', () => {
  it('builds a callback error redirect with normalized query params', () => {
    const target = buildAuthCallbackErrorRedirect({
      next: '/notes',
      fallback: '/notes',
      allowedPrefixes: ['/', '/notes'],
      description: 'Passkey sign-in failed. Please try again.',
    })

    const url = new URL(target, 'https://hominem.local')
    expect(url.pathname).toBe('/auth')
    expect(url.searchParams.get('error')).toBe(AUTH_CALLBACK_ERROR)
    expect(url.searchParams.get('error_description')).toBe(
      'Passkey sign-in failed. Please try again.',
    )
    expect(url.searchParams.get('next')).toBe('/notes')
  })

  it('prefers descriptive auth error query params for UI display', () => {
    const params = new URLSearchParams({
      error: AUTH_CALLBACK_ERROR,
      error_description: 'Passkey sign-in failed. Please try again.',
    })

    expect(readAuthErrorMessage(params)).toBe('Passkey sign-in failed. Please try again.')
  })
})
