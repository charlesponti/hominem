import { describe, expect, it } from 'vitest'

import { resolveMobileWorkspaceView } from '../../components/workspace/mobile-workspace-view'

describe('mobile workspace view resolution', () => {
  it('uses focused context screens for note and search', () => {
    expect(resolveMobileWorkspaceView('note')).toBe('note')
    expect(resolveMobileWorkspaceView('search')).toBe('search')
  })

  it('uses route-backed stack views for inbox, chat, and settings', () => {
    expect(resolveMobileWorkspaceView('inbox')).toBe('stack')
    expect(resolveMobileWorkspaceView('chat')).toBe('stack')
    expect(resolveMobileWorkspaceView('settings')).toBe('stack')
  })
})
