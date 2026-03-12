import { describe, expect, it } from 'vitest';

import {
  ALLOWED_TRANSITIONS,
  isBlockingState,
  isValidTransition,
  reachableFrom,
  type ThoughtLifecycleState,
} from './lifecycle-state';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Walks a sequence of states and asserts every consecutive pair is a valid transition.
 */
function assertPath(path: ThoughtLifecycleState[]) {
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    expect(isValidTransition(from, to), `expected valid transition: ${from} → ${to}`).toBe(true);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('isValidTransition', () => {
  it('accepts every transition listed in ALLOWED_TRANSITIONS', () => {
    for (const [from, to] of ALLOWED_TRANSITIONS) {
      expect(isValidTransition(from, to), `expected valid: ${from} → ${to}`).toBe(true);
    }
  });

  it('rejects transitions that are not in ALLOWED_TRANSITIONS', () => {
    const invalid: [ThoughtLifecycleState, ThoughtLifecycleState][] = [
      ['idle', 'recording'], // must compose first
      ['idle', 'classifying'], // must compose first
      ['idle', 'persisting'],
      ['composing', 'persisting'], // must classify first
      ['composing', 'reviewing_changes'],
      ['classifying', 'idle'], // must review first
      ['classifying', 'composing'],
      ['reviewing_changes', 'classifying'],
      ['persisting', 'composing'],
      ['persisting', 'classifying'],
      ['recording', 'composing'], // must transcribe first
      ['transcribing', 'idle'],
    ];

    for (const [from, to] of invalid) {
      expect(isValidTransition(from, to), `expected invalid: ${from} → ${to}`).toBe(false);
    }
  });
});

describe('ALLOWED_TRANSITIONS', () => {
  it('contains no duplicate entries', () => {
    const seen = new Set<string>();
    for (const [from, to] of ALLOWED_TRANSITIONS) {
      const key = `${from}->${to}`;
      expect(seen.has(key), `duplicate transition: ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('every "from" state is a reachable lifecycle state (no stale entries)', () => {
    const allStates: ThoughtLifecycleState[] = [
      'idle',
      'composing',
      'recording',
      'transcribing',
      'classifying',
      'reviewing_changes',
      'persisting',
      'recovering_error',
    ];
    for (const [from] of ALLOWED_TRANSITIONS) {
      expect(allStates).toContain(from);
    }
  });
});

describe('reachableFrom', () => {
  it('idle can reach composing only', () => {
    expect(reachableFrom('idle')).toEqual(['composing']);
  });

  it('classifying can reach reviewing_changes and recovering_error', () => {
    const reachable = reachableFrom('classifying');
    expect(reachable).toContain('reviewing_changes');
    expect(reachable).toContain('recovering_error');
    expect(reachable).toHaveLength(2);
  });

  it('reviewing_changes can reach persisting (accept) and idle (reject)', () => {
    const reachable = reachableFrom('reviewing_changes');
    expect(reachable).toContain('persisting');
    expect(reachable).toContain('idle');
    expect(reachable).toHaveLength(2);
  });

  it('recovering_error can reach idle (dismiss) and classifying (retry)', () => {
    const reachable = reachableFrom('recovering_error');
    expect(reachable).toContain('idle');
    expect(reachable).toContain('classifying');
    expect(reachable).toHaveLength(2);
  });

  it('persisting terminates at idle or recovering_error', () => {
    const reachable = reachableFrom('persisting');
    expect(reachable).toContain('idle');
    expect(reachable).toContain('recovering_error');
    expect(reachable).toHaveLength(2);
  });
});

describe('isBlockingState', () => {
  it('returns true for classifying, persisting, transcribing', () => {
    expect(isBlockingState('classifying')).toBe(true);
    expect(isBlockingState('persisting')).toBe(true);
    expect(isBlockingState('transcribing')).toBe(true);
  });

  it('returns false for non-blocking states', () => {
    const nonBlocking: ThoughtLifecycleState[] = [
      'idle',
      'composing',
      'recording',
      'reviewing_changes',
      'recovering_error',
    ];
    for (const state of nonBlocking) {
      expect(isBlockingState(state), `expected non-blocking: ${state}`).toBe(false);
    }
  });
});

describe('journey paths — canonical state machine transitions', () => {
  it('Journey 1: Capture → Save directly (text path)', () => {
    // idle → composing → classifying → reviewing_changes → persisting → idle
    assertPath(['idle', 'composing', 'classifying', 'reviewing_changes', 'persisting', 'idle']);
  });

  it('Journey 1: Capture → Save — user discards at review', () => {
    // reviewing_changes → idle (reject)
    assertPath(['idle', 'composing', 'classifying', 'reviewing_changes', 'idle']);
  });

  it('Journey 2: Capture → Session → Transform', () => {
    // Session path: composing → classifying (ArtifactActions "→ Note") → review → persist → idle
    assertPath(['idle', 'composing', 'classifying', 'reviewing_changes', 'persisting', 'idle']);
  });

  it('Journey 4: Voice → Thought → Save (full voice path)', () => {
    // idle → composing → recording → transcribing → classifying → reviewing_changes → persisting → idle
    assertPath([
      'idle',
      'composing',
      'recording',
      'transcribing',
      'classifying',
      'reviewing_changes',
      'persisting',
      'idle',
    ]);
  });

  it('Journey 4: Voice → user edits transcript before classifying', () => {
    // transcribing → composing → classifying (user edits the transcript text)
    assertPath(['idle', 'composing', 'recording', 'transcribing', 'composing', 'classifying']);
  });

  it('Journey 4: Voice recording cancelled', () => {
    // recording → idle (cancel)
    assertPath(['idle', 'composing', 'recording', 'idle']);
  });

  it('Journey 5: Error recovery — dismiss and retry from scratch', () => {
    // classifying → recovering_error → idle
    assertPath(['idle', 'composing', 'classifying', 'recovering_error', 'idle']);
  });

  it('Journey 5: Error recovery — retry directly from error state', () => {
    // recovering_error → classifying → reviewing_changes → persisting → idle
    assertPath([
      'idle',
      'composing',
      'classifying',
      'recovering_error',
      'classifying',
      'reviewing_changes',
      'persisting',
      'idle',
    ]);
  });

  it('Journey 5: Persist fails — recovering_error → idle', () => {
    assertPath([
      'idle',
      'composing',
      'classifying',
      'reviewing_changes',
      'persisting',
      'recovering_error',
      'idle',
    ]);
  });
});
