import { describe, expect, it } from 'vitest'

import { getLegacyWorkspaceRouteRedirect } from '../../components/workspace/mobile-legacy-routes'

describe('mobile legacy workspace routes', () => {
  it('redirects the legacy start route into inbox', () => {
    expect(getLegacyWorkspaceRouteRedirect('start')).toBe('/(protected)/(tabs)/focus')
  })
})
