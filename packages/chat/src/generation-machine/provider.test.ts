import { describe, expect, it } from 'vitest';

import {
  reconstructProviderToolCalls,
  reduceProviderChunk,
  reduceProviderTurnFailed,
} from './provider';
import type { GenerationState } from './types';

function baseState(overrides: Partial<GenerationState> = {}): GenerationState {
  return {
    generationId: 'generation-1',
    phase: 'running',
    iteration: 0,
    turnId: 'turn-1',
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

describe('reduceProviderChunk', () => {
  it('accumulates text and fragmented tool calls without side effects', () => {
    let state = baseState();
    state = reduceProviderChunk(state, {
      content: 'Searching',
      toolCalls: [
        { index: 0, id: 'call-1', function: { name: 'search_memories', arguments: '{"q' } },
      ],
    }).state;
    const step = reduceProviderChunk(state, {
      content: '…',
      toolCalls: [{ index: 0, function: { arguments: '":"x"}' } }],
    });

    expect(step.state.assistantText).toBe('Searching…');
    expect(step.state.requestedToolCalls).toEqual([
      {
        id: 'call-1',
        name: 'search_memories',
        arguments: '{"q":"x"}',
        iteration: 0,
        turnId: 'turn-1',
      },
    ]);
    expect(step.commands).toEqual([{ type: 'emit', event: { type: 'text-delta', text: '…' } }]);
  });

  it('emits reasoning deltas and preserves empty chunks', () => {
    const step = reduceProviderChunk(baseState(), { content: '', reasoning: 'thinking' });

    expect(step.state.reasoningText).toBe('thinking');
    expect(step.commands).toEqual([
      { type: 'emit', event: { type: 'reasoning-delta', text: 'thinking' } },
    ]);
  });

  it('fills missing tool-call fields when there is no turn id yet', () => {
    const step = reduceProviderChunk(baseState({ turnId: null }), {
      toolCalls: [{ index: 0, function: undefined }],
    });

    expect(step.state.requestedToolCalls).toEqual([
      { id: '', name: '', arguments: '', iteration: 0, turnId: 'unknown' },
    ]);
  });
});

describe('reconstructProviderToolCalls', () => {
  it('orders calls by provider index and preserves reconstructed arguments', () => {
    const calls = new Map([
      [1, { index: 1, id: 'second', function: { name: 'second', arguments: '{}' } }],
      [0, { index: 0, id: 'first', function: { name: 'first', arguments: '{"q":"x"}' } }],
    ]);

    expect(reconstructProviderToolCalls(calls)).toEqual([
      {
        id: 'first',
        type: 'function',
        function: { name: 'first', arguments: '{"q":"x"}' },
      },
      {
        id: 'second',
        type: 'function',
        function: { name: 'second', arguments: '{}' },
      },
    ]);
  });
});

describe('reduceProviderTurnFailed', () => {
  it('schedules a retry for a transient failure under the attempt limit', () => {
    const step = reduceProviderTurnFailed(baseState(), {
      type: 'provider-turn-failed',
      message: 'rate limited',
      transient: true,
      attempt: 0,
      maxAttempts: 2,
    });

    expect(step.commands).toEqual([
      {
        type: 'persist',
        event: { type: 'generation.retry_scheduled', attempt: 1, maxAttempts: 2 },
        idempotencyKey: 'generation-1:generation.retry_scheduled:1',
      },
      { type: 'retry-provider', attempt: 1 },
    ]);
  });

  it('fails terminally once attempts are exhausted', () => {
    const step = reduceProviderTurnFailed(baseState(), {
      type: 'provider-turn-failed',
      message: 'rate limited',
      transient: true,
      attempt: 2,
      maxAttempts: 2,
    });

    expect(step.state.phase).toBe('failed');
    expect(step.state.lastError).toBe('rate limited');
    expect(step.commands).toContainEqual({
      type: 'persist',
      event: { type: 'generation.failed', message: 'rate limited' },
      idempotencyKey: 'generation-1:generation.failed',
    });
  });

  it('fails immediately for a non-transient error', () => {
    const step = reduceProviderTurnFailed(baseState(), {
      type: 'provider-turn-failed',
      message: 'invalid request',
      transient: false,
      attempt: 0,
      maxAttempts: 2,
    });

    expect(step.state.phase).toBe('failed');
    expect(step.commands).toContainEqual({
      type: 'persist',
      event: { type: 'generation.failed', message: 'invalid request' },
      idempotencyKey: 'generation-1:generation.failed',
    });
  });
});
