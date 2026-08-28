import { describe, expect, it } from 'vitest';

import type { GenerationStartContext } from './generation-events';
import {
  createGenerationState,
  generationEventIdempotencyKey,
  reduceGeneration,
  runGeneration,
  type GenerationState,
  type GenerationInput,
} from './generation-machine';

const startContext = {
  chatId: 'chat-1',
  kind: 'send',
  userMessageId: 'message-1',
  targetAssistantMessageId: null,
  requestContext: {},
} satisfies GenerationStartContext;

const call = (overrides: Partial<GenerationState['requestedToolCalls'][number]> = {}) => ({
  id: 'call-1',
  name: 'search_memories',
  arguments: '{}',
  iteration: 0,
  turnId: 'turn-1',
  ...overrides,
});

describe('generation machine', () => {
  it('creates stable keys for accepted events', () => {
    expect(
      generationEventIdempotencyKey('generation-1', {
        type: 'generation.accepted',
        chatId: 'chat-1',
        userMessage: { id: 'message-1', chatId: 'chat-1', role: 'user', content: 'Hello' },
      }),
    ).toBe('generation-1:generation.accepted');
  });

  it('creates stable keys for lifecycle events that are emitted by adapters', () => {
    expect(
      generationEventIdempotencyKey('generation-1', {
        type: 'generation.cancel_requested',
        requestedAt: '2026-08-28T00:00:00.000Z',
        requestedBy: 'user-1',
      }),
    ).toBe('generation-1:generation.cancel_requested');
    expect(
      generationEventIdempotencyKey('generation-1', {
        type: 'generation.checkpointed',
        checkpoint: {
          turnId: 'turn-1',
          iteration: 0,
          assistantMessage: { id: 'assistant-1', chatId: 'chat-1', role: 'assistant', content: '' },
          pendingToolCallIds: [],
        },
      }),
    ).toBe('generation-1:generation.checkpointed');
  });

  it('reduces provider text and fragmented tool calls without side effects', () => {
    let state = createGenerationState('generation-1');
    state = reduceGeneration(state, {
      type: 'start',
      turnId: 'turn-1',
      context: startContext,
    }).state;
    state = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: {
        content: 'Searching',
        toolCalls: [
          { index: 0, id: 'call-1', function: { name: 'search_memories', arguments: '{"q' } },
        ],
      },
    }).state;
    const step = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: { content: '…', toolCalls: [{ index: 0, function: { arguments: '":"x"}' } }] },
    });

    expect(step.state.assistantText).toBe('Searching…');
    expect(step.state.requestedToolCalls).toEqual([call({ arguments: '{"q":"x"}' })]);
    expect(step.commands).toEqual([{ type: 'emit', event: { type: 'text-delta', text: '…' } }]);
  });

  it('emits reasoning deltas and preserves empty chunks', () => {
    const state = {
      ...createGenerationState('generation-1'),
      phase: 'running',
    } satisfies GenerationState;
    const step = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: { content: '', reasoning: 'thinking' },
    });

    expect(step.state.reasoningText).toBe('thinking');
    expect(step.commands).toEqual([
      { type: 'emit', event: { type: 'reasoning-delta', text: 'thinking' } },
    ]);
  });

  it('executes tools in order and opens the next provider turn after results', () => {
    let state = createGenerationState('generation-1');
    state = reduceGeneration(state, {
      type: 'start',
      turnId: 'turn-1',
      context: startContext,
    }).state;
    state = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: {
        toolCalls: [
          { index: 0, id: 'call-1', function: { name: 'search_memories', arguments: '{}' } },
        ],
      },
    }).state;
    const request = reduceGeneration(state, {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });

    expect(request.commands.at(-1)).toMatchObject({
      type: 'execute-tool',
      idempotencyKey: 'generation-1:turn-1:call-1',
    });

    const next = reduceGeneration(request.state, {
      type: 'tool-result',
      result: { callId: 'call-1', toolName: 'search_memories', content: '{}', error: false },
    });
    expect(next.state.iteration).toBe(1);
    expect(next.commands.at(-1)).toEqual({
      type: 'open-provider-turn',
      turnId: 'generation-1:1',
      iteration: 1,
    });
  });

  it('stops at confirmation and only executes after approval', () => {
    let state = createGenerationState('generation-1');
    state = reduceGeneration(state, {
      type: 'start',
      turnId: 'turn-1',
      context: startContext,
    }).state;
    state = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: {
        toolCalls: [
          { index: 0, id: 'call-1', function: { name: 'forget_memory', arguments: '{}' } },
        ],
      },
    }).state;
    const pending = reduceGeneration(state, {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: ['call-1'],
    });

    expect(pending.state.phase).toBe('awaiting_confirmation');
    expect(pending.commands.some((command) => command.type === 'execute-tool')).toBe(false);

    const approved = reduceGeneration(pending.state, {
      type: 'confirmation-approved',
      callId: 'call-1',
    });
    expect(approved.commands.at(-1)).toMatchObject({
      type: 'execute-tool',
      idempotencyKey: 'generation-1:turn-1:call-1',
    });
  });

  it('retries transient provider failures and fails terminally after the final attempt', () => {
    const state = createGenerationState('generation-1');
    const retry = reduceGeneration(state, {
      type: 'provider-turn-failed',
      message: 'rate limited',
      transient: true,
      attempt: 0,
      maxAttempts: 2,
    });
    expect(retry.commands.at(-1)).toEqual({ type: 'retry-provider', attempt: 1 });

    const failed = reduceGeneration(retry.state, {
      type: 'provider-turn-failed',
      message: 'rate limited',
      transient: true,
      attempt: 2,
      maxAttempts: 2,
    });
    expect(failed.state.phase).toBe('failed');
    expect(failed.commands).toContainEqual({
      type: 'persist',
      event: { type: 'generation.failed', message: 'rate limited' },
      idempotencyKey: 'generation-1:generation.failed',
    });
  });

  it('interprets commands serially and feeds effect inputs back into the reducer', async () => {
    const commands: string[] = [];
    const finalState = await runGeneration({
      generationId: 'generation-1',
      startContext,
      effects: {
        execute: async (command) => {
          commands.push(command.type);
          if (command.type === 'open-provider-turn') {
            return [
              { type: 'provider-chunk', chunk: { content: 'Done.' } },
              { type: 'provider-turn-completed', requiredToolCall: false, confirmationCallIds: [] },
            ];
          }
          if (command.type === 'save-generation') {
            return {
              type: 'generation-saved',
              message: {
                id: 'assistant-1',
                chatId: 'chat-1',
                role: 'assistant',
                content: 'Done.',
              },
            };
          }
          return undefined;
        },
      },
    });

    expect(finalState.phase).toBe('committed');
    expect(commands).toEqual([
      'persist',
      'persist',
      'emit',
      'open-provider-turn',
      'emit',
      'persist',
      'emit',
      'save-generation',
      'persist',
    ]);
  });

  it('fails when a required tool call is missing', () => {
    const step = reduceGeneration(createGenerationState('generation-1'), {
      type: 'provider-turn-completed',
      requiredToolCall: true,
      confirmationCallIds: [],
    });

    expect(step.state.phase).toBe('failed');
    expect(step.state.lastError).toBe('The model did not perform the required lookup');
  });

  it('fails immediately for non-transient provider errors', () => {
    const step = reduceGeneration(createGenerationState('generation-1'), {
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

  it('does not respond to an approval for another tool call', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'awaiting_confirmation',
      pendingConfirmation: call(),
    };

    expect(
      reduceGeneration(state, { type: 'confirmation-approved', callId: 'other-call' }),
    ).toEqual({ state, commands: [] });
  });

  it('does not respond to a rejection for another tool call', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'awaiting_confirmation',
      pendingConfirmation: call(),
    };

    expect(
      reduceGeneration(state, {
        type: 'confirmation-rejected',
        callId: 'other-call',
        reason: 'not now',
      }),
    ).toEqual({ state, commands: [] });
  });

  it('fills missing tool-call fields while reconstructing a turn without a turn id', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'running',
      turnId: null,
    };
    const step = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: {
        toolCalls: [{ index: 0, function: undefined }],
      },
    });

    expect(step.state.requestedToolCalls).toEqual([
      { id: '', name: '', arguments: '', iteration: 0, turnId: 'unknown' },
    ]);
  });

  it('records approval before executing the confirmed tool', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'awaiting_confirmation',
      turnId: 'turn-1',
      pendingConfirmation: call(),
    };
    const step = reduceGeneration(state, { type: 'confirmation-approved', callId: 'call-1' });

    expect(step.commands[0]).toEqual({
      type: 'persist',
      event: { type: 'confirmation.approved', callId: 'call-1' },
      idempotencyKey: 'generation-1:confirmation.approved:call-1',
    });
    expect(step.commands.at(-1)).toMatchObject({ type: 'execute-tool' });
  });

  it('converts rejection into a failed tool result and continues the turn', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'awaiting_confirmation',
      turnId: 'turn-1',
      pendingConfirmation: call(),
    };
    const step = reduceGeneration(state, {
      type: 'confirmation-rejected',
      callId: 'call-1',
      reason: 'not now',
    });

    expect(step.state.completedToolResults[0]).toMatchObject({ callId: 'call-1', error: true });
    expect(step.commands).toContainEqual({
      type: 'persist',
      event: { type: 'confirmation.rejected', callId: 'call-1', reason: 'not now' },
      idempotencyKey: 'generation-1:confirmation.rejected:call-1',
    });
  });

  it('executes multiple tool calls sequentially', () => {
    let state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'running',
      turnId: 'turn-1',
    };
    state = reduceGeneration(state, {
      type: 'provider-chunk',
      chunk: {
        toolCalls: [
          { index: 1, id: 'call-2', function: { name: 'second', arguments: '{}' } },
          { index: 0, id: 'call-1', function: { name: 'first', arguments: '{}' } },
        ],
      },
    }).state;
    const requested = reduceGeneration(state, {
      type: 'provider-turn-completed',
      requiredToolCall: false,
      confirmationCallIds: [],
    });
    const next = reduceGeneration(requested.state, {
      type: 'tool-result',
      result: { callId: 'call-1', toolName: 'first', content: '{}', error: false },
    });

    expect(next.state.activeToolCall?.id).toBe('call-2');
    expect(next.commands.at(-1)).toMatchObject({ type: 'execute-tool', call: { id: 'call-2' } });
  });

  it('cancels confirmation without invoking stop effects', () => {
    const state: GenerationState = {
      ...createGenerationState('generation-1'),
      phase: 'awaiting_confirmation',
      pendingConfirmation: call(),
    };
    const step = reduceGeneration(state, { type: 'cancel-requested' });

    expect(step.state.phase).toBe('cancelled');
    expect(step.commands.some((command) => command.type === 'stop-effects')).toBe(false);
  });

  it('requests cancellation for an active effect and finalizes after it stops', () => {
    const running = {
      ...createGenerationState('generation-1'),
      phase: 'running',
    } satisfies GenerationState;
    const requested = reduceGeneration(running, { type: 'cancel-requested' });

    expect(requested.state.phase).toBe('cancel_requested');
    expect(requested.commands.at(-1)).toEqual({ type: 'stop-effects' });
    expect(reduceGeneration(requested.state, { type: 'effect-stopped' }).state.phase).toBe(
      'cancelled',
    );
  });

  it('ignores inputs after a terminal state', () => {
    const state = {
      ...createGenerationState('generation-1'),
      phase: 'committed',
    } satisfies GenerationState;

    expect(reduceGeneration(state, { type: 'cancel-requested' })).toEqual({
      state,
      commands: [],
    });
  });

  it('accepts a single input and an async iterable from effects', async () => {
    async function* providerInputs(): AsyncGenerator<GenerationInput> {
      yield { type: 'provider-chunk', chunk: { content: 'Done.' } };
      yield {
        type: 'provider-turn-completed',
        requiredToolCall: false,
        confirmationCallIds: [],
      };
    }

    const finalState = await runGeneration({
      generationId: 'generation-1',
      startContext,
      effects: {
        execute: async (command) => {
          if (command.type === 'open-provider-turn') return providerInputs();
          if (command.type === 'save-generation') {
            return {
              type: 'generation-saved',
              message: {
                id: 'assistant-1',
                chatId: 'chat-1',
                role: 'assistant',
                content: 'Done.',
              },
            };
          }
          if (command.type === 'retry-provider') return { type: 'effect-stopped' };
          return undefined;
        },
      },
    });

    expect(finalState.phase).toBe('committed');
  });

  it('accepts a single generation input returned by an effect', async () => {
    const finalState = await runGeneration({
      generationId: 'generation-1',
      startContext,
      effects: {
        execute: async (command) => {
          if (command.type === 'open-provider-turn') {
            return {
              type: 'provider-turn-failed',
              message: 'bad gateway',
              transient: false,
              attempt: 0,
              maxAttempts: 1,
            };
          }
          return undefined;
        },
      },
    });

    expect(finalState.phase).toBe('failed');
    expect(finalState.lastError).toBe('bad gateway');
  });

  it('schedules a retry event with its attempt metadata', () => {
    const step = reduceGeneration(createGenerationState('generation-1'), {
      type: 'provider-turn-failed',
      message: 'temporary outage',
      transient: true,
      attempt: 0,
      maxAttempts: 2,
    });

    expect(step.commands).toContainEqual({
      type: 'persist',
      event: { type: 'generation.retry_scheduled', attempt: 1, maxAttempts: 2 },
      idempotencyKey: 'generation-1:generation.retry_scheduled:1',
    });
  });
});
