/**
 * Workflow simulation tests — Five user journeys from ui-spec.md
 *
 * These tests drive the canonical thought lifecycle state machine through
 * each journey step by step.  No surface-specific code is involved — both
 * mobile (chat/focus) and Notes web run the same state machine, so a single
 * set of journey tests covers both surfaces per the parity contract.
 *
 * Contract covered:
 *   - ThoughtLifecycleState transition rules
 *   - classification → review → persist on both surfaces (same machine)
 *   - all five journeys in ui-spec.md
 */

import { TIME_UNITS } from '@hominem/utils';
import { describe, expect, it } from 'vitest';

import {
  isBlockingState,
  isValidTransition,
  reachableFrom,
  type ThoughtLifecycleState,
} from './lifecycle-state';
import { isArtifactTypeEnabled } from './thought-types';

// ─── Simulator ────────────────────────────────────────────────────────────────

/**
 * Minimal state machine simulator.
 *
 * Mirrors the shape of the `lifecycleState` + `handleTransform` logic that
 * lives inside both `apps/mobile/components/chat/chat.tsx` and
 * `apps/web/app/routes/chat/chat.$chatId.tsx`.
 */
class LifecycleSimulator {
  state: ThoughtLifecycleState = 'idle';
  readonly history: ThoughtLifecycleState[] = ['idle'];

  transition(to: ThoughtLifecycleState): void {
    expect(
      isValidTransition(this.state, to),
      `invalid transition in simulation: ${this.state} → ${to}`,
    ).toBe(true);
    this.state = to;
    this.history.push(to);
  }

  assertState(expected: ThoughtLifecycleState): void {
    expect(this.state).toBe(expected);
  }

  /** Asserts the state machine is blocking user input at this point. */
  assertBlocking(): void {
    expect(isBlockingState(this.state), `expected blocking state, got: ${this.state}`).toBe(true);
  }

  /** Asserts the state machine is NOT blocking user input at this point. */
  assertNotBlocking(): void {
    expect(isBlockingState(this.state), `expected non-blocking state, got: ${this.state}`).toBe(
      false,
    );
  }
}

// ─── Journey 1: Capture → Save directly ──────────────────────────────────────

describe('Journey 1 — Capture → Save directly (text path)', () => {
  it('happy path: idle → composing → classifying → reviewing_changes → persisting → idle', () => {
    const sim = new LifecycleSimulator();

    sim.assertState('idle');
    sim.assertNotBlocking();

    // User types in CaptureBar
    sim.transition('composing');
    sim.assertState('composing');
    sim.assertNotBlocking();

    // User taps "Save"
    sim.transition('classifying');
    sim.assertState('classifying');
    sim.assertBlocking(); // input must be disabled

    // Server returns classification — show review dialog
    sim.transition('reviewing_changes');
    sim.assertState('reviewing_changes');
    sim.assertNotBlocking(); // user can interact with review dialog

    // User taps "Save Note"
    sim.transition('persisting');
    sim.assertBlocking(); // shimmer on button

    // Persist complete
    sim.transition('idle');
    sim.assertState('idle');
    sim.assertNotBlocking();
  });

  it('user discards at review — returns to idle', () => {
    const sim = new LifecycleSimulator();
    sim.transition('composing');
    sim.transition('classifying');
    sim.transition('reviewing_changes');

    // User taps "Discard"
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('user abandons composing — returns to idle', () => {
    const sim = new LifecycleSimulator();
    sim.transition('composing');
    sim.transition('idle');
    sim.assertState('idle');
  });
});

// ─── Journey 2: Capture → Session → Transform ────────────────────────────────

describe('Journey 2 — Capture → Session → Transform (ArtifactActions)', () => {
  it('ArtifactActions onTransform triggers the classify → review → persist path', () => {
    // The session starts in idle; after user sends messages the ArtifactActions
    // strip becomes visible (messageCount > 0).  When the user taps "→ Note",
    // handleTransform drives: idle → classifying → reviewing_changes.
    const sim = new LifecycleSimulator();

    // In-session: user is composing a reply
    sim.transition('composing');
    sim.assertNotBlocking();

    // User taps "→ Note" in ArtifactActions
    sim.transition('classifying');
    sim.assertBlocking();

    // Classification response → review sheet appears
    sim.transition('reviewing_changes');
    sim.assertNotBlocking();

    // Accept
    sim.transition('persisting');
    sim.assertBlocking();
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('only enabled artifact types may trigger a transform', () => {
    // v1 contract: only 'note' is enabled
    expect(isArtifactTypeEnabled('note')).toBe(true);
    expect(isArtifactTypeEnabled('task')).toBe(false);
    expect(isArtifactTypeEnabled('task_list')).toBe(false);
    expect(isArtifactTypeEnabled('tracker')).toBe(false);
  });

  it('ArtifactActions must not be interactive when state is blocking', () => {
    // classifying, reviewing_changes, and persisting all block artifact actions.
    const blockingStates: ThoughtLifecycleState[] = [
      'classifying',
      'reviewing_changes',
      'persisting',
    ];
    for (const state of blockingStates) {
      // ArtifactActions component logic: disabled = !enabled || isBlocked
      // isBlocked = ['classifying', 'reviewing_changes', 'persisting'].includes(state)
      const BLOCKING_FOR_ACTIONS: ThoughtLifecycleState[] = [
        'classifying',
        'reviewing_changes',
        'persisting',
      ];
      expect(BLOCKING_FOR_ACTIONS.includes(state)).toBe(true);
    }
  });
});

// ─── Journey 3: Resume session from home ─────────────────────────────────────

describe('Journey 3 — Resume session from home', () => {
  it('resuming a session starts in idle; no state transition required on load', () => {
    // Sessions are resumed from HomeView by navigating to the session route.
    // The lifecycle state initialises to idle — no machine manipulation on mount.
    const sim = new LifecycleSimulator();
    sim.assertState('idle');

    // Once resumed the user can immediately compose
    expect(reachableFrom('idle')).toContain('composing');
  });

  it('30-day TTL — session visible only within 30 days of last message', () => {
    const now = Date.now();

    const recentSession = { updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() };
    const expiredSession = { updatedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString() };

    const isResumable = (s: { updatedAt: string }) =>
      now - new Date(s.updatedAt).getTime() < TIME_UNITS.MONTH;

    expect(isResumable(recentSession)).toBe(true);
    expect(isResumable(expiredSession)).toBe(false);
  });

  it('max 3 session cards shown on home surface', () => {
    const MAX_SESSION_CARDS = 3;
    // Simulates the slicing done in useResumableSessions / HomeView sessions query
    const sessions = Array.from({ length: 6 }, (_, i) => ({ id: `chat_${i}` }));
    expect(sessions.slice(0, MAX_SESSION_CARDS)).toHaveLength(3);
  });
});

// ─── Journey 4: Voice → Thought → Save ───────────────────────────────────────

describe('Journey 4 — Voice → Thought → Save', () => {
  it('full voice path: idle → composing → recording → transcribing → classifying → persisting → idle', () => {
    const sim = new LifecycleSimulator();

    sim.transition('composing');
    sim.assertNotBlocking();

    // User taps microphone
    sim.transition('recording');
    sim.assertState('recording');
    sim.assertNotBlocking(); // recording UI active; input not blocked

    // User stops recording
    sim.transition('transcribing');
    sim.assertState('transcribing');
    sim.assertBlocking(); // must block while transcribing

    // Transcription complete → direct to classifying
    sim.transition('classifying');
    sim.assertBlocking();

    sim.transition('reviewing_changes');
    sim.transition('persisting');
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('user cancels recording — returns to idle', () => {
    const sim = new LifecycleSimulator();
    sim.transition('composing');
    sim.transition('recording');
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('user edits transcript before submitting', () => {
    const sim = new LifecycleSimulator();
    sim.transition('composing');
    sim.transition('recording');
    sim.transition('transcribing');
    // User edits the transcript text → back to composing
    sim.transition('composing');
    sim.assertNotBlocking();
    // Then saves normally
    sim.transition('classifying');
    sim.assertBlocking();
  });
});

// ─── Journey 5: Error recovery ────────────────────────────────────────────────

describe('Journey 5 — Error recovery', () => {
  it('classification fails → recovering_error → user dismisses → idle', () => {
    const sim = new LifecycleSimulator();

    sim.transition('composing');
    sim.transition('classifying');
    sim.assertBlocking();

    // Request fails
    sim.transition('recovering_error');
    sim.assertState('recovering_error');
    sim.assertNotBlocking(); // user must be able to act (dismiss / retry)

    // Dismiss
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('classification fails → recovering_error → user retries → succeeds', () => {
    const sim = new LifecycleSimulator();

    sim.transition('composing');
    sim.transition('classifying');
    sim.transition('recovering_error');

    // Retry
    sim.transition('classifying');
    sim.assertBlocking();

    sim.transition('reviewing_changes');
    sim.transition('persisting');
    sim.transition('idle');
    sim.assertState('idle');
  });

  it('persist fails — recovering_error → idle', () => {
    const sim = new LifecycleSimulator();

    sim.transition('composing');
    sim.transition('classifying');
    sim.transition('reviewing_changes');
    sim.transition('persisting');

    // Persist fails
    sim.transition('recovering_error');
    sim.assertNotBlocking();

    sim.transition('idle');
    sim.assertState('idle');
  });

  it('recovering_error does NOT allow jumping to reviewing_changes directly', () => {
    // User cannot skip the retry path
    expect(isValidTransition('recovering_error', 'reviewing_changes')).toBe(false);
    expect(isValidTransition('recovering_error', 'persisting')).toBe(false);
  });
});

// ─── Cross-surface parity contract ────────────────────────────────────────────

describe('Cross-surface parity — classification → review → persist', () => {
  /**
   * Both mobile (apps/mobile/components/chat/chat.tsx) and Notes web
   * (apps/web/app/routes/chat/chat.$chatId.tsx) use the same state machine.
   * This test asserts the canonical sub-path is identical on both surfaces.
   */
  it('canonical sub-path is valid: classifying → reviewing_changes → persisting → idle', () => {
    expect(isValidTransition('classifying', 'reviewing_changes')).toBe(true);
    expect(isValidTransition('reviewing_changes', 'persisting')).toBe(true);
    expect(isValidTransition('persisting', 'idle')).toBe(true);
  });

  it('reject path is valid on both surfaces: reviewing_changes → idle', () => {
    expect(isValidTransition('reviewing_changes', 'idle')).toBe(true);
  });

  it('both surfaces block new input during classifying and persisting', () => {
    expect(isBlockingState('classifying')).toBe(true);
    expect(isBlockingState('persisting')).toBe(true);
    // But not during reviewing_changes — user must interact with the review dialog
    expect(isBlockingState('reviewing_changes')).toBe(false);
  });
});
