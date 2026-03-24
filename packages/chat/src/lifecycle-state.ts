/**
 * Canonical thought lifecycle state machine.
 *
 * Both mobile (chat/focus) and web (Notes chat) import from this module.
 * No surface may define its own state aliases for these lifecycle states.
 */

export type ThoughtLifecycleState =
  | 'idle'
  | 'composing'
  | 'recording'
  | 'transcribing'
  | 'classifying'
  | 'reviewing_changes'
  | 'persisting'
  | 'recovering_error';

export type ThoughtLifecycleTransition = [from: ThoughtLifecycleState, to: ThoughtLifecycleState];

/**
 * Every valid state transition. Any transition not listed here is forbidden.
 *
 * Visual map:
 *   idle ──► composing ──► classifying ──► reviewing_changes ──► persisting ──► idle
 *                │                │                │                 │
 *                ▼                ▼                ▼                 ▼
 *            recording      recovering_error    idle           recovering_error
 *                │
 *                ▼
 *           transcribing ──► composing
 *                     └────► classifying
 */
export const ALLOWED_TRANSITIONS: ThoughtLifecycleTransition[] = [
  // Idle ↔ composing
  ['idle', 'composing'],
  ['composing', 'idle'],

  // Voice path
  ['composing', 'recording'],
  ['recording', 'idle'], // cancelled
  ['recording', 'transcribing'],
  ['transcribing', 'composing'], // user edits transcript
  ['transcribing', 'classifying'], // direct voice → classify

  // Save path
  ['composing', 'classifying'],
  ['classifying', 'reviewing_changes'],
  ['classifying', 'recovering_error'],

  // Review
  ['reviewing_changes', 'persisting'], // accepted
  ['reviewing_changes', 'idle'], // rejected

  // Persist
  ['persisting', 'idle'],
  ['persisting', 'recovering_error'],

  // Error recovery
  ['recovering_error', 'idle'], // dismiss
  ['recovering_error', 'classifying'], // retry
];

/**
 * Returns true if transitioning from `from` to `to` is permitted by the state machine.
 */
export function isValidTransition(from: ThoughtLifecycleState, to: ThoughtLifecycleState): boolean {
  return ALLOWED_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/**
 * Returns all states reachable from `from` in a single step.
 */
export function reachableFrom(from: ThoughtLifecycleState): ThoughtLifecycleState[] {
  return ALLOWED_TRANSITIONS.filter(([f]) => f === from).map(([, t]) => t);
}

/**
 * Returns true if the state represents an in-flight operation where the UI
 * should prevent new user input.
 */
export function isBlockingState(state: ThoughtLifecycleState): boolean {
  return state === 'classifying' || state === 'persisting' || state === 'transcribing';
}
