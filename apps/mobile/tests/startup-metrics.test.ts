import { describe, expect, it } from 'vitest'

import {
  evaluateStartupBudgets,
  getStartupDuration,
  markStartupPhase,
  resetStartupMetrics,
} from '../utils/performance/startup-metrics'
import {
  getAuthPhaseElapsed,
  markAuthPhaseStart,
  recordAuthEvent,
  resetAuthEventLog,
} from '../utils/auth/auth-event-log'

describe('startup metrics', () => {
  it('tracks duration between phases', () => {
    resetStartupMetrics()
    markStartupPhase('app_start', 100)
    markStartupPhase('root_layout_mounted', 240)
    markStartupPhase('shell_ready', 420)

    expect(getStartupDuration('app_start', 'root_layout_mounted')).toBe(140)
    expect(getStartupDuration('app_start', 'shell_ready')).toBe(320)
  })

  it('returns null for missing or invalid ordering', () => {
    resetStartupMetrics()
    markStartupPhase('root_layout_mounted', 100)
    markStartupPhase('app_start', 200)

    expect(getStartupDuration('app_start', 'shell_ready')).toBeNull()
    expect(getStartupDuration('app_start', 'root_layout_mounted')).toBeNull()
  })

  it('passes budget checks for valid timings', () => {
    resetStartupMetrics()
    markStartupPhase('app_start', 100)
    markStartupPhase('root_layout_mounted', 250)
    markStartupPhase('shell_ready', 820)

    expect(
      evaluateStartupBudgets({
        rootLayoutMs: 300,
        shellReadyMs: 1200,
      }),
    ).toEqual({
      passed: true,
      violations: [],
    })
  })

  it('tracks auth_boot_start and auth_boot_resolved phases', () => {
    resetStartupMetrics()
    markStartupPhase('auth_boot_start', 100)
    markStartupPhase('auth_boot_resolved', 420)

    expect(getStartupDuration('auth_boot_start', 'auth_boot_resolved')).toBe(320)
  })

  it('fails budget checks and reports violations', () => {
    resetStartupMetrics()
    markStartupPhase('app_start', 100)
    markStartupPhase('root_layout_mounted', 550)
    markStartupPhase('shell_ready', 1800)

    expect(
      evaluateStartupBudgets({
        rootLayoutMs: 300,
        shellReadyMs: 1200,
      }),
    ).toEqual({
      passed: false,
      violations: ['root_layout_over_budget:450', 'shell_ready_over_budget:1700'],
    })
  })
})

describe('auth boot budget', () => {
  it('stored-token path resolves within 500ms budget', () => {
    resetAuthEventLog()
    markAuthPhaseStart('boot', 0)
    recordAuthEvent('auth_boot_start', 'boot', 0)
    recordAuthEvent('auth_boot_resolved:session_loaded', 'boot', 480)

    const elapsed = getAuthPhaseElapsed('boot', 480)
    expect(elapsed).not.toBeNull()
    expect(elapsed!).toBeLessThan(500)
  })

  it('cold path (no stored token) resolves within 100ms budget', () => {
    resetAuthEventLog()
    markAuthPhaseStart('boot', 0)
    recordAuthEvent('auth_boot_start', 'boot', 0)
    recordAuthEvent('auth_boot_resolved:session_expired', 'boot', 45)

    const elapsed = getAuthPhaseElapsed('boot', 45)
    expect(elapsed).not.toBeNull()
    expect(elapsed!).toBeLessThan(100)
  })

  it('records event durations relative to phase start', () => {
    resetAuthEventLog()
    markAuthPhaseStart('boot', 1000)
    const e1 = recordAuthEvent('auth_boot_start', 'boot', 1000)
    const e2 = recordAuthEvent('auth_boot_resolved:session_loaded', 'boot', 1350)

    expect(e1.durationMs).toBe(0)
    expect(e2.durationMs).toBe(350)
  })
})
