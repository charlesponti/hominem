import { describe, expect, it } from 'vitest';

import type { GenerationMessageSnapshot, GenerationStartContext } from './generation-events';
import type { GenerationHistoryEventPayload } from './generation-machine';
import {
  GenerationProjectionError,
  rebuildGenerationProjection,
  reduceGenerationProjection,
  type GenerationRunIdentity,
  type GenerationRunProjection,
} from './generation-projection';

const identity: GenerationRunIdentity = {
  generationId: 'generation-1',
  chatId: 'chat-1',
  ownerUserId: 'user-1',
  kind: 'regenerate',
  userMessageId: 'message-1',
  targetAssistantMessageId: 'assistant-1',
};

const started = {
  type: 'generation.started',
  context: {
    chatId: 'chat-1',
    kind: 'regenerate',
    userMessageId: 'message-1',
    targetAssistantMessageId: 'assistant-1',
    requestContext: {},
  },
} satisfies GenerationHistoryEventPayload;

const committed = {
  type: 'generation.committed',
  message: {
    id: 'assistant-2',
    chatId: 'chat-1',
    role: 'assistant',
    content: 'Done',
  },
} satisfies GenerationHistoryEventPayload;

function contextWith(overrides: Partial<GenerationStartContext>): GenerationStartContext {
  return { ...started.context, ...overrides };
}

describe('generation projection', () => {
  it('rebuilds a committed projection from ordered events', () => {
    expect(
      rebuildGenerationProjection(identity, [
        started,
        { type: 'generation.phase_changed', phase: 'saving' },
        committed,
      ]),
    ).toEqual({
      ...identity,
      status: 'committed',
      assistantMessageId: 'assistant-2',
      errorMessage: null,
    });
  });

  it('projects checkpoints and terminal failures', () => {
    const checkpoint = {
      type: 'generation.checkpointed',
      checkpoint: {
        turnId: 'turn-1',
        iteration: 0,
        assistantMessage: {
          id: 'assistant-1',
          chatId: 'chat-1',
          role: 'assistant',
          content: 'Waiting',
        },
        pendingToolCallIds: ['call-1'],
      },
    } satisfies GenerationHistoryEventPayload;
    expect(
      rebuildGenerationProjection(identity, [
        started,
        checkpoint,
        { type: 'generation.failed', message: 'Provider failed' },
      ]),
    ).toMatchObject({ status: 'failed', errorMessage: 'Provider failed' });
  });

  it('projects each active lifecycle event without changing immutable identity', () => {
    const running = reduceGenerationProjection(null, identity, started);
    const assistantMessage = {
      id: 'assistant-checkpoint',
      chatId: identity.chatId,
      role: 'assistant',
      content: 'Waiting for confirmation',
    } satisfies GenerationMessageSnapshot;
    const toolCall = {
      id: 'call-1',
      name: 'write_memory',
      arguments: '{}',
      iteration: 0,
      turnId: 'turn-1',
    };

    const cases: Array<{
      event: GenerationHistoryEventPayload;
      status: GenerationRunProjection['status'];
      assistantMessageId?: string;
    }> = [
      {
        event: {
          type: 'generation.accepted',
          chatId: identity.chatId,
          userMessage: { ...assistantMessage, role: 'user' },
        },
        status: 'running',
      },
      { event: { type: 'generation.phase_changed', phase: 'preparing' }, status: 'preparing' },
      { event: { type: 'generation.phase_changed', phase: 'running' }, status: 'running' },
      { event: { type: 'generation.phase_changed', phase: 'saving' }, status: 'saving' },
      {
        event: {
          type: 'generation.cancel_requested',
          requestedAt: '2026-08-28T00:00:00.000Z',
          requestedBy: 'user-1',
        },
        status: 'cancel_requested',
      },
      {
        event: {
          type: 'generation.checkpointed',
          checkpoint: {
            turnId: 'turn-1',
            iteration: 0,
            assistantMessage,
            pendingToolCallIds: ['call-1'],
          },
        },
        status: 'awaiting_confirmation',
        assistantMessageId: assistantMessage.id,
      },
      {
        event: { type: 'generation.retry_scheduled', attempt: 1, maxAttempts: 2 },
        status: 'running',
      },
      { event: { type: 'tool.requested', call: toolCall }, status: 'running' },
      {
        event: {
          type: 'tool.completed',
          result: { callId: toolCall.id, toolName: toolCall.name, content: '{}', error: false },
        },
        status: 'running',
      },
      {
        event: {
          type: 'tool.failed',
          result: { callId: toolCall.id, toolName: toolCall.name, content: 'failed', error: true },
        },
        status: 'running',
      },
      { event: { type: 'confirmation.required', call: toolCall }, status: 'running' },
      {
        event: { type: 'confirmation.approved', callId: toolCall.id, call: toolCall },
        status: 'running',
      },
      {
        event: {
          type: 'confirmation.rejected',
          callId: toolCall.id,
          reason: 'No thanks',
          call: toolCall,
        },
        status: 'running',
      },
    ];

    for (const entry of cases) {
      const assistantMessageId = 'assistantMessageId' in entry ? entry.assistantMessageId : null;
      expect(reduceGenerationProjection(running, identity, entry.event)).toEqual({
        ...identity,
        status: entry.status,
        assistantMessageId,
        errorMessage: null,
      });
    }
    expect(reduceGenerationProjection(running, identity, { type: 'generation.cancelled' })).toEqual(
      {
        ...identity,
        status: 'cancelled',
        assistantMessageId: null,
        errorMessage: null,
      },
    );
  });

  it('rejects identity mismatches, missing starts, duplicate starts, and terminal conflicts', () => {
    expect(() => rebuildGenerationProjection(identity, [])).toThrow(GenerationProjectionError);
    expect(() => rebuildGenerationProjection(identity, [committed])).toThrow(
      'preceded generation.started',
    );
    expect(() => rebuildGenerationProjection(identity, [started, started])).toThrow('duplicated');
    expect(() =>
      rebuildGenerationProjection(identity, [started, committed, { type: 'generation.cancelled' }]),
    ).toThrow('followed a terminal event');
    for (const context of [
      contextWith({ chatId: 'other-chat' }),
      contextWith({ kind: 'send' }),
      contextWith({ userMessageId: null }),
      contextWith({ targetAssistantMessageId: null }),
    ]) {
      expect(() => rebuildGenerationProjection(identity, [{ ...started, context }])).toThrow(
        'does not match run identity',
      );
    }
  });
});
