import { describe, expect, it } from 'vitest';

import type { GenerationStartContext } from '../generation-events';
import { messageSnapshot } from '../generation-test-fixtures';
import {
  reduceCancelRequested,
  reduceEffectStopped,
  reduceGenerationFailed,
  reduceGenerationSaved,
  reduceStart,
} from './lifecycle';
import type { GenerationState } from './types';

function baseState(overrides: Partial<GenerationState> = {}): GenerationState {
  return {
    generationId: 'generation-1',
    phase: 'preparing',
    iteration: 0,
    turnId: null,
    assistantText: '',
    reasoningText: '',
    requestedToolCalls: [],
    toolCalls: [],
    pendingToolCalls: [],
    completedToolResults: [],
    activeToolCall: null,
    pendingConfirmation: null,
    lastError: null,
    ...overrides,
  };
}

const startContext = {
  chatId: 'chat-1',
  kind: 'send',
  userMessageId: 'message-1',
  targetAssistantMessageId: null,
  requestContext: {},
} satisfies GenerationStartContext;

describe('reduceStart', () => {
  it('moves to running and opens the first provider turn', () => {
    const step = reduceStart(baseState(), {
      type: 'start',
      turnId: 'turn-1',
      context: startContext,
    });

    expect(step.state.phase).toBe('running');
    expect(step.state.turnId).toBe('turn-1');
    expect(step.commands).toEqual([
      {
        type: 'persist',
        event: { type: 'generation.started', context: startContext },
        idempotencyKey: 'generation-1:generation.started',
      },
      {
        type: 'persist',
        event: { type: 'generation.phase_changed', phase: 'running' },
        idempotencyKey: 'generation-1:generation.phase_changed:running',
      },
      { type: 'emit', event: { type: 'phase-changed', phase: 'running' } },
      { type: 'open-provider-turn', turnId: 'turn-1', iteration: 0 },
    ]);
  });
});

describe('reduceCancelRequested', () => {
  it('cancels immediately while awaiting confirmation, without stop effects', () => {
    const step = reduceCancelRequested(baseState({ phase: 'awaiting_confirmation' }));

    expect(step.state.phase).toBe('cancelled');
    expect(step.commands.some((command) => command.type === 'stop-effects')).toBe(false);
  });

  it('requests a stop for an active effect otherwise', () => {
    const step = reduceCancelRequested(baseState({ phase: 'running' }));

    expect(step.state.phase).toBe('cancel_requested');
    expect(step.commands.at(-1)).toEqual({ type: 'stop-effects' });
  });
});

describe('reduceEffectStopped', () => {
  it('finalizes cancellation once the active effect confirms it stopped', () => {
    const step = reduceEffectStopped(baseState({ phase: 'cancel_requested' }));
    expect(step.state.phase).toBe('cancelled');
  });
});

describe('reduceGenerationSaved', () => {
  it('commits with the saved message', () => {
    const message = messageSnapshot({ id: 'assistant-1', chatId: 'chat-1', content: 'Done.' });
    const step = reduceGenerationSaved(baseState({ phase: 'saving' }), message);

    expect(step.state.phase).toBe('committed');
    expect(step.commands).toEqual([
      {
        type: 'persist',
        event: { type: 'generation.committed', message },
        idempotencyKey: 'generation-1:generation.committed',
      },
    ]);
  });
});

describe('reduceGenerationFailed', () => {
  it('fails with the given message', () => {
    const step = reduceGenerationFailed(baseState({ phase: 'running' }), 'bad gateway');

    expect(step.state.phase).toBe('failed');
    expect(step.state.lastError).toBe('bad gateway');
    expect(step.commands).toEqual([
      {
        type: 'persist',
        event: { type: 'generation.failed', message: 'bad gateway' },
        idempotencyKey: 'generation-1:generation.failed',
      },
    ]);
  });
});
