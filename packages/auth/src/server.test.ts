import { describe, expect, it } from 'vitest'

import { resolveSafeAuthRedirect } from './server'

describe('resolveSafeAuthRedirect', () => {
  it('returns fallback for empty or external targets', () => {
    expect(resolveSafeAuthRedirect('', '/finance', ['/finance'])).toBe('/finance')
    expect(resolveSafeAuthRedirect('https://evil.example', '/finance', ['/finance'])).toBe('/finance')
    expect(resolveSafeAuthRedirect('//evil.example', '/finance', ['/finance'])).toBe('/finance')
  })

  it('allows only configured in-app prefixes', () => {
    expect(resolveSafeAuthRedirect('/finance/accounts?tab=all', '/finance', ['/finance', '/accounts']))
      .toBe('/finance/accounts?tab=all')
    expect(resolveSafeAuthRedirect('/accounts/123', '/finance', ['/finance', '/accounts']))
      .toBe('/accounts/123')
    expect(resolveSafeAuthRedirect('/admin', '/finance', ['/finance', '/accounts']))
      .toBe('/finance')
  })
})
