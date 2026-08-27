import { describe, expect, it } from 'vitest';

import {
  GenerationDomainEventSchema,
  GenerationLiveEventSchema,
  legacyEventToLiveEvent,
  parseGenerationDomainEvent,
  parseGenerationLiveEvent,
  type GenerationDomainEvent,
} from './generation-events';

const chat = {
  id: 'chat-1',
  userId: 'user-1',
  title: 'Chat',
  archivedAt: null,
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z',
};

const message = {
  id: 'message-1',
  chatId: 'chat-1',
  userId: 'user-1',
  role: 'assistant' as const,
  content: 'Done.',
  files: null,
  toolCalls: null,
  reasoning: null,
  parentMessageId: null,
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z',
};

const turn = { turnId: 'turn-1', iteration: 0 };
const envelope = (payload: GenerationDomainEvent['payload']): unknown => ({
  version: 1,
  generationId: 'generation-1',
  sequence: 1,
  type: payload.type,
  payload,
});

describe('generation RPC event contract', () => {
  it('parses every durable event variant with its matching payload discriminant', () => {
    const payloads: GenerationDomainEvent['payload'][] = [
      {
        type: 'generation.started',
        context: { chatId: 'chat-1', kind: 'start', userMessageId: null, requestContext: {} },
      },
      { type: 'generation.accepted', chatId: 'chat-1', chat, userMessage: message },
      { type: 'generation.phase_changed', phase: 'running' },
      { type: 'generation.cancel_requested', requestedAt: 'now', requestedBy: 'user-1' },
      {
        type: 'generation.checkpointed',
        checkpoint: { ...turn, assistantMessage: message, pendingToolCallIds: [] },
      },
      {
        type: 'generation.retry_scheduled',
        ...turn,
        operation: 'provider',
        attempt: 1,
        maxAttempts: 2,
        retryAt: 'later',
        errorCategory: 'rate_limit',
      },
      { type: 'tool.requested', call: { id: 'call-1', name: 'search', arguments: '{}', ...turn } },
      {
        type: 'tool.completed',
        result: { callId: 'call-1', toolName: 'search', content: '{}', error: false },
      },
      {
        type: 'tool.failed',
        result: { callId: 'call-1', toolName: 'search', content: 'failed', error: true },
      },
      {
        type: 'confirmation.required',
        ...turn,
        messageId: 'message-1',
        toolCallId: 'call-1',
        toolName: 'forget_memory',
        args: {},
        preview: null,
      },
      { type: 'confirmation.approved', ...turn, callId: 'call-1' },
      { type: 'confirmation.rejected', ...turn, callId: 'call-1', reason: 'No' },
      { type: 'generation.committed', metadata: turn, message },
      { type: 'generation.cancelled', metadata: { ...turn, cancelledAt: 'now' } },
      {
        type: 'generation.failed',
        message: 'Failed',
        metadata: { ...turn, errorCategory: 'provider' },
      },
    ];

    for (const payload of payloads) {
      expect(parseGenerationDomainEvent(envelope(payload))).toMatchObject({
        type: payload.type,
        payload: { type: payload.type },
      });
    }
  });

  it('narrows the payload type from the event discriminant', () => {
    const event = parseGenerationDomainEvent(
      envelope({ type: 'generation.committed', metadata: turn, message }),
    );

    if (event.type === 'generation.committed') expect(event.payload.message.id).toBe('message-1');
    else throw new Error('fixture must be committed');
  });

  it('parses live deltas and tool steps without a durable sequence', () => {
    expect(
      parseGenerationLiveEvent({
        version: 1,
        generationId: 'generation-1',
        event: { type: 'text-delta', text: 'Hello' },
      }),
    ).toEqual({
      version: 1,
      generationId: 'generation-1',
      event: { type: 'text-delta', text: 'Hello' },
    });
    expect(
      GenerationLiveEventSchema.parse({
        version: 1,
        generationId: 'generation-1',
        event: { type: 'tool-step', toolCallId: 'call-1', toolName: 'search', status: 'completed' },
      }).event.type,
    ).toBe('tool-step');
  });

  it.each([
    ['unsupported version', { version: 2 }],
    ['negative sequence', { sequence: -1 }],
    ['fractional sequence', { sequence: 1.5 }],
    ['unsafe sequence', { sequence: Number.MAX_SAFE_INTEGER + 1 }],
    ['non-numeric sequence', { sequence: '1' }],
  ])('rejects %s', (_name, override) => {
    const input = Object.assign(
      envelope({ type: 'generation.phase_changed', phase: 'running' }) as Record<string, unknown>,
      override,
    );
    expect(() => GenerationDomainEventSchema.parse(input)).toThrow();
  });

  it('rejects unknown and mismatched event types', () => {
    const phaseEvent = envelope({ type: 'generation.phase_changed', phase: 'running' });
    expect(() =>
      GenerationDomainEventSchema.parse(Object.assign({}, phaseEvent, { type: 'unknown' })),
    ).toThrow();
    expect(() =>
      GenerationDomainEventSchema.parse(Object.assign({}, phaseEvent, { type: 'tool.failed' })),
    ).toThrow();
  });

  it('adapts legacy live events and excludes durable legacy events', () => {
    expect(
      legacyEventToLiveEvent({ type: 'text-delta', generationId: 'generation-1', text: 'Hi' }),
    ).toEqual({
      version: 1,
      generationId: 'generation-1',
      event: { type: 'text-delta', text: 'Hi' },
    });
    expect(
      legacyEventToLiveEvent({
        type: 'accepted',
        generationId: 'generation-1',
        chatId: 'chat-1',
        chat,
        userMessage: message,
      }),
    ).toBeNull();
  });
});
