import { describe, expect, it } from 'vitest'

import {
  evaluateStartupBudgets,
  getStartupDuration,
  markStartupPhase,
  resetStartupMetrics,
} from '../utils/performance/startup-metrics'

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
