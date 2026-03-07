type StartupPhase = 'app_start' | 'root_layout_mounted' | 'shell_ready'

interface StartupMetric {
  phase: StartupPhase
  atMs: number
}

const phaseTimes = new Map<StartupPhase, number>()

export function markStartupPhase(phase: StartupPhase, nowMs: number = Date.now()): StartupMetric {
  phaseTimes.set(phase, nowMs)
  return { phase, atMs: nowMs }
}

export function getStartupDuration(from: StartupPhase, to: StartupPhase): number | null {
  const fromMs = phaseTimes.get(from)
  const toMs = phaseTimes.get(to)
  if (fromMs === undefined || toMs === undefined || toMs < fromMs) {
    return null
  }
  return toMs - fromMs
}

export function resetStartupMetrics(): void {
  phaseTimes.clear()
}

export function evaluateStartupBudgets(budgets: {
  rootLayoutMs: number
  shellReadyMs: number
}): { passed: boolean; violations: string[] } {
  const violations: string[] = []
  const rootLayoutMs = getStartupDuration('app_start', 'root_layout_mounted')
  const shellReadyMs = getStartupDuration('app_start', 'shell_ready')

  if (rootLayoutMs === null) {
    violations.push('missing_root_layout_metric')
  } else if (rootLayoutMs > budgets.rootLayoutMs) {
    violations.push(`root_layout_over_budget:${rootLayoutMs}`)
  }

  if (shellReadyMs === null) {
    violations.push('missing_shell_ready_metric')
  } else if (shellReadyMs > budgets.shellReadyMs) {
    violations.push(`shell_ready_over_budget:${shellReadyMs}`)
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}
