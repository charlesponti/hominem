// The one true capture lifecycle state machine. Mobile (chat/focus) and web
// (Notes chat) both import from here — don't let a surface define its own
// aliases for these states, this package is the single source of truth.

export type { CaptureLifecycleState } from './capture-types';

import type { CaptureLifecycleState } from './capture-types';

// Every valid state transition — anything not listed here is not allowed.
//
//   idle ──► composing ──► classifying ──► reviewing_changes ──► persisting ──► idle
//                │                │                │                 │
//                ▼                ▼                ▼                 ▼
//            recording      recovering_error    idle           recovering_error
//                │
//                ▼
//           transcribing ──► composing
//                     └────► classifying
export const ALLOWED_TRANSITIONS: Array<readonly [CaptureLifecycleState, CaptureLifecycleState]> = [
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

// True when the state is mid-flight and the UI should block new user input
export function isBlockingState(state: CaptureLifecycleState): boolean {
  return state === 'classifying' || state === 'persisting' || state === 'transcribing';
}
