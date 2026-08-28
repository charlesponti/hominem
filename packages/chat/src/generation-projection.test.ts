import { describe, expect, it } from 'vitest';

import {
  GenerationProjectionError,
  rebuildGenerationProjection,
  reduceGenerationProjection,
  type GenerationRunIdentity,
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
  type: 'generation.started' as const,
  context: {
    chatId: 'chat-1',
    kind: 'regenerate' as const,
    userMessageId: 'message-1',
    targetAssistantMessageId: 'assistant-1',
    requestContext: {},
  },
};

const committed = {
  type: 'generation.committed' as const,
  message: {
    id: 'assistant-2',
    chatId: 'chat-1',
    role: 'assistant' as const,
    content: 'Done',
  },
};

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
      type: 'generation.checkpointed' as const,
      checkpoint: {
        turnId: 'turn-1',
        iteration: 0,
        assistantMessage: {
          id: 'assistant-1',
          chatId: 'chat-1',
          role: 'assistant' as const,
          content: 'Waiting',
        },
        pendingToolCallIds: ['call-1'],
      },
    };
    expect(
      rebuildGenerationProjection(identity, [
        started,
        checkpoint,
        { type: 'generation.failed', message: 'Provider failed' },
      ]),
    ).toMatchObject({ status: 'failed', errorMessage: 'Provider failed' });
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
  });

  it('rejects a committed event without a final message', () => {
    const step = reduceGenerationProjection(null, identity, started);
    expect(() =>
      reduceGenerationProjection(step, identity, { type: 'generation.committed' } as never),
    ).toThrow('missing its message');
  });
});
