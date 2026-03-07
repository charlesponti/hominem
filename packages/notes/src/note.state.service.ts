import type { NoteStatus } from './contracts'

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

const TRANSITIONS: Record<NoteStatus, ReadonlyArray<NoteStatus>> = {
  draft: ['published'],
  published: ['archived', 'draft'],
  archived: ['published'],
}

export function assertAllowedTransition(
  currentStatus: NoteStatus,
  nextStatus: NoteStatus,
  action: string,
): void {
  if (currentStatus === nextStatus) {
    return
  }

  const allowed = TRANSITIONS[currentStatus]
  if (!allowed.includes(nextStatus)) {
    throw new ConflictError(`Cannot ${action} note from ${currentStatus} to ${nextStatus}`)
  }
}
