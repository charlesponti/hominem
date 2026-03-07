export interface AuthEvent {
  event: string
  phase: string
  timestamp: number
  durationMs: number | null
}

const events: AuthEvent[] = []
const phaseStartTimes = new Map<string, number>()

export function recordAuthEvent(
  event: string,
  phase: string,
  nowMs: number = Date.now(),
): AuthEvent {
  const phaseStart = phaseStartTimes.get(phase)
  const durationMs = phaseStart !== undefined ? nowMs - phaseStart : null

  const entry: AuthEvent = { event, phase, timestamp: nowMs, durationMs }
  events.push(entry)
  return entry
}

export function markAuthPhaseStart(phase: string, nowMs: number = Date.now()): void {
  phaseStartTimes.set(phase, nowMs)
}

export function getAuthPhaseElapsed(phase: string, nowMs: number = Date.now()): number | null {
  const start = phaseStartTimes.get(phase)
  return start !== undefined ? nowMs - start : null
}

export function getAuthEvents(): readonly AuthEvent[] {
  return events
}

export function resetAuthEventLog(): void {
  events.length = 0
  phaseStartTimes.clear()
}
