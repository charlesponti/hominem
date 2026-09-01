import { describe, expect, it } from 'vitest';

import {
  createGenerationClientState,
  parseGenerationClientCheckpoint,
  reduceGenerationClientEvent,
  toGenerationClientCheckpoint,
  type GenerationClientEvent,
  type GenerationClientErrorEvent,
} from './generation-client';
import type { GenerationHistoryEvent } from './generation-machine';
import {
  chatSnapshot,
  messageSnapshot,
  toolEventRoundTripFixture,
} from './generation-test-fixtures';

const call = {
  id: 'call-1',
  name: 'search',
  arguments: '{}',
  iteration: 0,
  turnId: 'turn-1',
};

const message = messageSnapshot({
  id: 'assistant-1',
  chatId: 'chat-1',
  content: 'Done',
  reasoning: 'Because',
});

function durable(
  sequence: number,
  payload: GenerationHistoryEvent['payload'],
): GenerationClientEvent {
  const envelope: { version: 1; generationId: string; sequence: number } = {
    version: 1,
    generationId: 'generation-1',
    sequence,
  };
  switch (payload.type) {
    case 'generation.started':
      return { ...envelope, type: 'generation.started', payload };
    case 'generation.accepted':
      return { ...envelope, type: 'generation.accepted', payload };
    case 'generation.phase_changed':
      return { ...envelope, type: 'generation.phase_changed', payload };
    case 'generation.cancel_requested':
      return { ...envelope, type: 'generation.cancel_requested', payload };
    case 'generation.checkpointed':
      return { ...envelope, type: 'generation.checkpointed', payload };
    case 'generation.retry_scheduled':
      return { ...envelope, type: 'generation.retry_scheduled', payload };
    case 'tool.requested':
      return { ...envelope, type: 'tool.requested', payload };
    case 'tool.completed':
      return { ...envelope, type: 'tool.completed', payload };
    case 'tool.failed':
      return { ...envelope, type: 'tool.failed', payload };
    case 'confirmation.required':
      return { ...envelope, type: 'confirmation.required', payload };
    case 'confirmation.approved':
      return { ...envelope, type: 'confirmation.approved', payload };
    case 'confirmation.rejected':
      return { ...envelope, type: 'confirmation.rejected', payload };
    case 'generation.committed':
      return { ...envelope, type: 'generation.committed', payload };
    case 'generation.cancelled':
      return { ...envelope, type: 'generation.cancelled', payload };
    case 'generation.failed':
      return { ...envelope, type: 'generation.failed', payload };
  }
}

function live(
  event: Extract<GenerationClientEvent, { event: unknown }>['event'],
): GenerationClientEvent {
  return { version: 1, generationId: 'generation-1', event };
}

describe('generation client reducer', () => {
  it('ignores events for another generation and duplicate durable events', () => {
    const initial = createGenerationClientState('generation-1');
    const foreign = {
      version: 1,
      generationId: 'other',
      event: { type: 'text-delta', text: 'ignored' },
    } satisfies GenerationClientEvent;
    const next = reduceGenerationClientEvent(initial, foreign);
    const acceptedEvent = durable(1, { type: 'generation.phase_changed', phase: 'running' });
    const accepted = reduceGenerationClientEvent(next, acceptedEvent);

    expect(reduceGenerationClientEvent(accepted, acceptedEvent)).toBe(accepted);
    expect(accepted).toMatchObject({ phase: 'running', lastDurableSequence: 1 });
  });

  it('accumulates live text, reasoning, and updates tool steps', () => {
    let state = createGenerationClientState('generation-1');
    state = reduceGenerationClientEvent(state, live({ type: 'text-delta', text: 'Hel' }));
    state = reduceGenerationClientEvent(state, live({ type: 'text-delta', text: 'lo' }));
    state = reduceGenerationClientEvent(state, live({ type: 'reasoning-delta', text: 'Think' }));
    state = reduceGenerationClientEvent(
      state,
      live({ type: 'tool-step', toolCallId: 'call-1', toolName: 'search', status: 'running' }),
    );
    state = reduceGenerationClientEvent(
      state,
      live({ type: 'tool-step', toolCallId: 'call-2', toolName: 'calendar', status: 'requested' }),
    );
    state = reduceGenerationClientEvent(
      state,
      live({ type: 'tool-step', toolCallId: 'call-1', toolName: 'search', status: 'completed' }),
    );

    expect(state).toMatchObject({ text: 'Hello', reasoning: 'Think' });
    expect(state.toolSteps).toEqual([
      { toolCallId: 'call-1', toolName: 'search', status: 'completed' },
      { toolCallId: 'call-2', toolName: 'calendar', status: 'requested' },
    ]);
  });

  it('reduces live phases and errors', () => {
    let state = createGenerationClientState('generation-1');
    state = reduceGenerationClientEvent(
      state,
      live({ type: 'phase-changed', phase: 'awaiting_confirmation' }),
    );
    const errorEvent = {
      version: 1,
      generationId: 'generation-1',
      event: { type: 'error', message: 'failed' },
    } satisfies GenerationClientErrorEvent;
    state = reduceGenerationClientEvent(state, errorEvent);

    expect(state).toMatchObject({ phase: 'failed', error: 'failed' });
  });

  it('reduces durable tool, confirmation, retry, cancellation, and terminal events', () => {
    let state = createGenerationClientState('generation-1');
    state = reduceGenerationClientEvent(state, durable(1, { type: 'tool.requested', call }));
    state = reduceGenerationClientEvent(
      state,
      durable(2, {
        type: 'tool.completed',
        result: { callId: 'call-1', toolName: 'search', content: 'ok', error: false },
      }),
    );
    state = reduceGenerationClientEvent(
      state,
      durable(3, {
        type: 'tool.failed',
        result: { callId: 'call-1', toolName: 'search', content: 'failed', error: true },
      }),
    );
    state = reduceGenerationClientEvent(state, durable(4, { type: 'confirmation.required', call }));
    state = reduceGenerationClientEvent(
      state,
      durable(5, {
        type: 'generation.retry_scheduled',
        attempt: 1,
        maxAttempts: 2,
      }),
    );
    expect(state.phase).toBe('running');
    state = reduceGenerationClientEvent(
      state,
      durable(6, { type: 'generation.failed', message: 'nope' }),
    );
    expect(state).toMatchObject({ phase: 'failed', error: 'nope' });
    state = reduceGenerationClientEvent(state, durable(7, { type: 'generation.cancelled' }));
    expect(state.phase).toBe('cancelled');
  });

  it('round-trips rejected confirmation and a later failed tool without double-applying replay', () => {
    const secondCall = {
      ...call,
      id: 'call-2',
      name: 'write',
      arguments: '{"value":"x"}',
    };
    const events: GenerationClientEvent[] = [
      durable(1, { type: 'tool.requested', call }),
      durable(2, { type: 'confirmation.required', call }),
      durable(3, {
        type: 'confirmation.rejected',
        callId: call.id,
        reason: 'User rejected tool call',
        call,
      }),
      durable(4, { type: 'tool.requested', call: secondCall }),
      durable(5, {
        type: 'tool.failed',
        result: {
          callId: secondCall.id,
          toolName: secondCall.name,
          content: 'failed',
          error: true,
        },
      }),
    ];

    let state = createGenerationClientState('generation-1');
    for (const event of events) state = reduceGenerationClientEvent(state, event);
    const beforeDuplicate = state;
    state = reduceGenerationClientEvent(state, events.at(-1)!);

    expect(state).toBe(beforeDuplicate);
    expect(state).toMatchObject({
      phase: 'awaiting_confirmation',
      lastDurableSequence: 5,
      toolSteps: [
        { toolCallId: 'call-1', toolName: 'search', status: 'requested' },
        { toolCallId: 'call-2', toolName: 'write', status: 'failed' },
      ],
    });
  });

  it('reduces the shared persistence round-trip fixture to the expected terminal state', () => {
    let state = createGenerationClientState('generation-1');
    for (const [index, payload] of toolEventRoundTripFixture().entries()) {
      state = reduceGenerationClientEvent(state, durable(index + 1, payload));
    }

    expect(state).toMatchObject({
      phase: 'committed',
      lastDurableSequence: 11,
      text: 'Saved',
      toolSteps: [
        { toolCallId: 'call-search', toolName: 'search', status: 'completed' },
        { toolCallId: 'call-write', toolName: 'write_memory', status: 'failed' },
      ],
    });
  });

  it('reduces start, accept, checkpoint, confirmation resolution, and cancellation request as no-op facts', () => {
    let state = createGenerationClientState('generation-1');
    const events = [
      durable(1, {
        type: 'generation.started',
        context: {
          chatId: 'chat-1',
          kind: 'send',
          userMessageId: null,
          targetAssistantMessageId: null,
          requestContext: {},
        },
      }),
      durable(2, {
        type: 'generation.accepted',
        chatId: 'chat-1',
        chat: chatSnapshot(),
        userMessage: messageSnapshot({
          id: 'user-1',
          chatId: 'chat-1',
          role: 'user',
          content: 'Hi',
        }),
      }),
      durable(3, {
        type: 'generation.checkpointed',
        checkpoint: {
          turnId: 'turn-1',
          iteration: 0,
          assistantMessage: message,
          pendingToolCallIds: [],
        },
      }),
      durable(4, { type: 'confirmation.approved', callId: 'call-1' }),
      durable(5, { type: 'confirmation.rejected', callId: 'call-1', reason: 'no' }),
      durable(6, {
        type: 'generation.cancel_requested',
        requestedAt: '2026-01-01T00:00:00.000Z',
        requestedBy: 'user-1',
      }),
    ];
    for (const event of events) state = reduceGenerationClientEvent(state, event);

    expect(state.lastDurableSequence).toBe(6);
    expect(state.phase).toBe('cancel_requested');
  });

  it('uses committed message content and preserves prior reasoning when absent', () => {
    let state = reduceGenerationClientEvent(
      createGenerationClientState('generation-1'),
      live({ type: 'reasoning-delta', text: 'prior' }),
    );
    state = reduceGenerationClientEvent(
      state,
      durable(1, {
        type: 'generation.committed',
        message: { ...message, reasoning: null },
      }),
    );

    expect(state).toMatchObject({ phase: 'committed', text: 'Done', reasoning: 'prior' });
  });

  it('round-trips only the durable client checkpoint and rejects unsafe persisted values', () => {
    let state = createGenerationClientState('generation-1');
    state = reduceGenerationClientEvent(
      state,
      durable(4, { type: 'generation.phase_changed', phase: 'awaiting_confirmation' }),
    );

    const checkpoint = toGenerationClientCheckpoint(state);
    expect(checkpoint).toEqual({
      generationId: 'generation-1',
      phase: 'awaiting_confirmation',
      lastDurableSequence: 4,
    });
    expect(parseGenerationClientCheckpoint(checkpoint)).toEqual(checkpoint);
    expect(() =>
      parseGenerationClientCheckpoint({ ...checkpoint, lastDurableSequence: Number.NaN }),
    ).toThrow();
    expect(() => parseGenerationClientCheckpoint({ ...checkpoint, unexpected: true })).toThrow();
  });
});
