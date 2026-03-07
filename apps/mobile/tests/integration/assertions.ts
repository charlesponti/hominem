import { expect } from 'vitest'

import type { AuthRedirectTarget } from '../../utils/navigation/auth-route-guard'
import type { AuthState } from '../../utils/auth/types'

export function expectAuthStatus(state: AuthState, expected: AuthState['status']) {
  expect(state.status).toBe(expected)
}

export function expectNoRedirect(target: AuthRedirectTarget | null) {
  expect(target).toBeNull()
}

export function expectRedirect(
  target: AuthRedirectTarget | null,
  expected: AuthRedirectTarget,
) {
  expect(target).toBe(expected)
}

export function expectLoadingState(state: AuthState, isLoading: boolean) {
  expect(state.isLoading).toBe(isLoading)
}

export function expectRetryDelayWithinBackoff(delayMs: number, maxMs = 30_000) {
  expect(delayMs).toBeGreaterThanOrEqual(0)
  expect(delayMs).toBeLessThanOrEqual(maxMs)
}
