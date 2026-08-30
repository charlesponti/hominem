import { describe, expect, it } from 'vitest';

import { toGenerationClientEvents } from '../generation-client-events';
import type { ChatMessageDto } from './chat.types';
import {
  GenerationDomainEventSchema,
  GenerationLiveEventSchema,
  createGenerationEventDeduplicator,
  getGenerationFailureMessage,
  legacyEventToLiveEvent,
  parseGenerationDomainEvent,
  parseGenerationLiveEvent,
  parseGenerationWireEvent,
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
  role: 'assistant',
  content: 'Done.',
  files: null,
  toolCalls: null,
  reasoning: null,
  parentMessageId: null,
  createdAt: '2026-08-27T00:00:00.000Z',
  updatedAt: '2026-08-27T00:00:00.000Z',
} satisfies ChatMessageDto;

const turn = { turnId: 'turn-1', iteration: 0 };
const envelope = (payload: GenerationDomainEvent['payload']): Record<string, unknown> => ({
  version: 1,
  generationId: 'generation-1',
  sequence: 1,
  type: payload.type,
  payload,
});

describe('generation RPC event contract', () => {
  it('adapts every durable and live wire event to the shared chat reducer', () => {
    const payloads: GenerationDomainEvent['payload'][] = [
      {
        type: 'generation.started',
        context: {
          chatId: 'chat-1',
          kind: 'start',
          userMessageId: null,
          targetAssistantMessageId: null,
          requestContext: {},
        },
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
        args: { key: 'value' },
        preview: { recordId: 'record-1' },
      },
      { type: 'confirmation.approved', ...turn, callId: 'call-1' },
      { type: 'confirmation.rejected', ...turn, callId: 'call-1', reason: 'No' },
      { type: 'generation.committed', metadata: turn, message },
      { type: 'generation.cancelled', metadata: { ...turn, cancelledAt: 'now' } },
      {
        type: 'generation.failed',
        message: 'Failed',
        metadata: { ...turn, errorCategory: 'provider', errorMessage: 'details' },
      },
    ];

    for (const payload of payloads) {
      const event = parseGenerationDomainEvent(envelope(payload));
      expect(toGenerationClientEvents(event)).toBeInstanceOf(Array);
    }

    expect(
      toGenerationClientEvents(
        parseGenerationLiveEvent({
          version: 1,
          generationId: 'generation-1',
          event: { type: 'text-delta', text: 'Hello' },
        }),
      ),
    ).toHaveLength(1);
    expect(
      toGenerationClientEvents(
        parseGenerationLiveEvent({
          version: 1,
          generationId: 'generation-1',
          event: { type: 'error', message: 'failed' },
        }),
      ),
    ).toMatchObject([{ event: { type: 'error', message: 'failed' } }]);
  });

  it('drops wire messages that cannot become provider-independent snapshots', () => {
    const invalidMessage = { ...message, role: 'tool' } satisfies ChatMessageDto;
    expect(
      toGenerationClientEvents(
        parseGenerationDomainEvent(
          envelope({ type: 'generation.committed', message: invalidMessage }),
        ),
      ),
    ).toEqual([]);
    expect(
      toGenerationClientEvents(
        parseGenerationDomainEvent(
          envelope({
            type: 'generation.checkpointed',
            checkpoint: { ...turn, assistantMessage: invalidMessage, pendingToolCallIds: [] },
          }),
        ),
      ),
    ).toEqual([]);
  });

  it('maps terminal metadata and confirmation arguments into chat snapshots', () => {
    const committed = parseGenerationDomainEvent(
      envelope({
        type: 'generation.committed',
        metadata: { ...turn, assistantMessage: message, errorCategory: 'none' },
        message,
      }),
    );
    const cancelled = parseGenerationDomainEvent(
      envelope({ type: 'generation.cancelled', metadata: { ...turn, cancelledAt: 'now' } }),
    );
    const failed = parseGenerationDomainEvent(
      envelope({
        type: 'generation.failed',
        message: 'Failed',
        metadata: { ...turn, errorCategory: 'provider', errorMessage: 'details' },
      }),
    );
    const failedWithoutMetadata = parseGenerationDomainEvent(
      envelope({ type: 'generation.failed', message: 'Failed without metadata' }),
    );
    const confirmation = parseGenerationDomainEvent(
      envelope({
        type: 'confirmation.required',
        ...turn,
        messageId: 'message-1',
        toolCallId: 'call-1',
        toolName: 'forget_memory',
        args: { key: 'value' },
        preview: { recordId: 'record-1' },
      }),
    );

    expect(toGenerationClientEvents(committed)).toMatchObject([
      { type: 'generation.committed', payload: { message: { id: 'message-1' } } },
    ]);
    expect(toGenerationClientEvents(cancelled)).toMatchObject([
      { type: 'generation.cancelled', payload: { metadata: { cancelledAt: 'now' } } },
    ]);
    expect(toGenerationClientEvents(failed)).toMatchObject([
      { type: 'generation.failed', payload: { metadata: { errorMessage: 'details' } } },
    ]);
    expect(toGenerationClientEvents(failedWithoutMetadata)).toMatchObject([
      { type: 'generation.failed', payload: { metadata: undefined } },
    ]);
    expect(toGenerationClientEvents(confirmation)).toMatchObject([
      {
        type: 'confirmation.required',
        payload: {
          call: {
            arguments: '{"key":"value"}',
            messageId: 'message-1',
            preview: { recordId: 'record-1' },
          },
        },
      },
    ]);
  });

  it('parses every durable event variant with its matching payload discriminant', () => {
    const payloads: GenerationDomainEvent['payload'][] = [
      {
        type: 'generation.started',
        context: {
          chatId: 'chat-1',
          kind: 'start',
          userMessageId: null,
          targetAssistantMessageId: null,
          requestContext: {},
        },
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
    expect(
      parseGenerationWireEvent({
        version: 1,
        generationId: 'generation-1',
        event: { type: 'reasoning-delta', text: 'Thinking' },
      }),
    ).toMatchObject({ event: { type: 'reasoning-delta' } });
  });

  it('normalizes durable and live failures at the stream boundary', () => {
    expect(
      getGenerationFailureMessage(
        parseGenerationDomainEvent(
          envelope({ type: 'generation.failed', message: 'durable failure' }),
        ),
      ),
    ).toBe('durable failure');
    expect(
      getGenerationFailureMessage(
        parseGenerationLiveEvent({
          version: 1,
          generationId: 'generation-1',
          event: { type: 'error', message: 'live failure' },
        }),
      ),
    ).toBe('live failure');
    expect(
      getGenerationFailureMessage(
        parseGenerationLiveEvent({
          version: 1,
          generationId: 'generation-1',
          event: { type: 'text-delta', text: 'not a failure' },
        }),
      ),
    ).toBeNull();
  });

  it('deduplicates durable replay/live overlap without dropping live deltas', () => {
    const deduplicate = createGenerationEventDeduplicator();
    const durable = parseGenerationDomainEvent(
      envelope({ type: 'generation.phase_changed', phase: 'running' }),
    );
    const live = parseGenerationLiveEvent({
      version: 1,
      generationId: 'generation-1',
      event: { type: 'text-delta', text: 'token' },
    });

    expect(deduplicate(durable)).toBe(durable);
    expect(deduplicate(durable)).toBeNull();
    expect(deduplicate(live)).toBe(live);
    expect(deduplicate(live)).toBe(live);
  });

  it.each([
    ['unsupported version', { version: 2 }],
    ['negative sequence', { sequence: -1 }],
    ['fractional sequence', { sequence: 1.5 }],
    ['unsafe sequence', { sequence: Number.MAX_SAFE_INTEGER + 1 }],
    ['non-numeric sequence', { sequence: '1' }],
  ])('rejects %s', (_name, override) => {
    const input = Object.assign(
      envelope({ type: 'generation.phase_changed', phase: 'running' }),
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
    expect(
      legacyEventToLiveEvent({ type: 'phase', generationId: 'generation-1', phase: 'generating' }),
    ).toMatchObject({ event: { type: 'phase-changed', phase: 'running' } });
    expect(
      legacyEventToLiveEvent({
        type: 'tool-step',
        generationId: 'generation-1',
        toolCallId: 'call-1',
        toolName: 'search',
        status: 'requested',
      }),
    ).toMatchObject({ event: { type: 'tool-step', status: 'requested' } });
    expect(
      legacyEventToLiveEvent({
        type: 'reasoning-delta',
        generationId: 'generation-1',
        text: 'Hmm',
      }),
    ).toMatchObject({ event: { type: 'reasoning-delta', text: 'Hmm' } });
  });
});
