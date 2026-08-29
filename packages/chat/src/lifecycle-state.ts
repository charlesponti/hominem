/**
 * Canonical capture lifecycle state machine.
 *
 * Both mobile (chat/focus) and web (Notes chat) import from this module.
 * No surface may define its own state aliases for these lifecycle states.
 *
 * Types are owned by this domain package as the single source of truth.
 */

export type { CaptureLifecycleState, CaptureLifecycleTransition } from './capture-types';

import type { CaptureLifecycleState, CaptureLifecycleTransition } from './capture-types';

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
export const ALLOWED_TRANSITIONS: CaptureLifecycleTransition[] = [
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
 * Returns true if the state represents an in-flight operation where the UI
 * should prevent new user input.
 */
export function isBlockingState(state: CaptureLifecycleState): boolean {
  return state === 'classifying' || state === 'persisting' || state === 'transcribing';
}
