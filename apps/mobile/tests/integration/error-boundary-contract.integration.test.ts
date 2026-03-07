import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createBoundaryLogContext,
  createBoundaryStateFromError,
  createFeatureFallbackLabel,
  createRootFallbackMessage,
  resetBoundaryState,
} from '../../utils/error-boundary/contracts'
import { clearErrorLog, getErrorLog, logError } from '../../utils/error-boundary/log-error'

describe('error boundary contract integration', () => {
  beforeEach(() => {
    clearErrorLog()
  })

  it('creates scoped fallback behavior for chat/focus/auth feature failures', () => {
    const chatState = createBoundaryStateFromError(new Error('chat exploded'))
    const focusState = createBoundaryStateFromError(new Error('focus exploded'))
    const authState = createBoundaryStateFromError(new Error('auth exploded'))

    expect(chatState.hasError).toBe(true)
    expect(focusState.hasError).toBe(true)
    expect(authState.hasError).toBe(true)

    expect(createFeatureFallbackLabel('Chat')).toBe('Chat is unavailable')
    expect(createFeatureFallbackLabel('Focus')).toBe('Focus is unavailable')
    expect(createFeatureFallbackLabel('Auth')).toBe('Auth is unavailable')
  })

  it('supports root boundary recovery path for uncaught failures', () => {
    const failed = createBoundaryStateFromError(new Error('uncaught render failure'))
    expect(createRootFallbackMessage(failed.error)).toBe('uncaught render failure')

    const recovered = resetBoundaryState()
    expect(recovered).toEqual({
      hasError: false,
      error: null,
    })
  })

  it('emits structured log entries without throwing during app flow', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const context = createBoundaryLogContext({
      feature: 'chat',
      route: '/(protected)/(tabs)/sherpa',
      userId: 'user-1',
    })

    expect(() =>
      logError(new Error('chat failed'), { componentStack: 'stack' }, context),
    ).not.toThrow()

    const entries = getErrorLog()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.feature).toBe('chat')
    expect(entries[0]?.route).toBe('/(protected)/(tabs)/sherpa')
    expect(entries[0]?.userId).toBe('user-1')
    expect(entries[0]?.error.message).toBe('chat failed')

    consoleSpy.mockRestore()
  })
})
