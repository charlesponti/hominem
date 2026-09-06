// The one true capture lifecycle state machine. Mobile (chat/focus) and web
// (Notes chat) both import from here — don't let a surface define its own
// aliases for these states, this package is the single source of truth.

export type { CaptureLifecycleState } from './capture-types';

import type { CaptureLifecycleState } from './capture-types';

// Shared lifecycle predicates for the capture state machine. Transition
// ownership remains with the platform-specific hooks that dispatch actions.
// True when the state is mid-flight and the UI should block new user input
export function isBlockingState(state: CaptureLifecycleState): boolean {
  return state === 'classifying' || state === 'persisting' || state === 'transcribing';
}
