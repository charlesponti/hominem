import { describe, expect, it } from 'vitest'

import { resolveRootIndexRedirect } from '../../utils/navigation/root-index-redirect'

describe('root index redirect', () => {
  it('routes signed-out users to auth', () => {
    expect(resolveRootIndexRedirect(false)).toBe('/(auth)')
  })

  it('routes signed-in users to protected start', () => {
    expect(resolveRootIndexRedirect(true)).toBe('/(protected)/(tabs)/start')
  })
})
