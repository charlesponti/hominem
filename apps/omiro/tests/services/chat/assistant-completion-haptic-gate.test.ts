import { describe, expect, it } from 'vitest';

import { createAssistantCompletionHapticGate } from '~/services/chat/assistant-completion-haptic-gate';

describe('assistant completion haptic gate', () => {
  it('tells the mutation settle handler to fire when nothing was marked completed', () => {
    const gate = createAssistantCompletionHapticGate();

    expect(gate.consumeForMutationSettle('assistant-1')).toBe(true);
  });

  it('suppresses the mutation settle handler once for the message the background reconcile already completed', () => {
    const gate = createAssistantCompletionHapticGate();

    gate.markCompletedViaBackgroundReconcile('assistant-1');

    expect(gate.consumeForMutationSettle('assistant-1')).toBe(false);
  });

  it('only suppresses once — consuming clears the mark', () => {
    const gate = createAssistantCompletionHapticGate();

    gate.markCompletedViaBackgroundReconcile('assistant-1');
    gate.consumeForMutationSettle('assistant-1');

    expect(gate.consumeForMutationSettle('assistant-1')).toBe(true);
  });

  it('does not suppress a different message than the one reconciled', () => {
    const gate = createAssistantCompletionHapticGate();

    gate.markCompletedViaBackgroundReconcile('assistant-1');

    expect(gate.consumeForMutationSettle('assistant-2')).toBe(true);
    // The original mark is still live for its own message.
    expect(gate.consumeForMutationSettle('assistant-1')).toBe(false);
  });

  it('fires when the settling message id is undefined (context missing)', () => {
    const gate = createAssistantCompletionHapticGate();

    gate.markCompletedViaBackgroundReconcile('assistant-1');

    expect(gate.consumeForMutationSettle(undefined)).toBe(true);
  });
});
