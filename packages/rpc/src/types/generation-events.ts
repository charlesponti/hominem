import type {
  ChatGenerationKind,
  GenerationPhase,
  GenerationToolCall,
  ToolResult,
} from '@hominem/chat';
import * as z from 'zod';

import type { Chat, LegacyChatStreamEvent } from './chat.types';

export const GENERATION_EVENT_VERSION = 1;

const jsonObjectSchema = z.record(z.string(), z.json());
const turnSchema = z.object({
  turnId: z.string().min(1),
  iteration: z.number().int().nonnegative(),
});
const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.string(),
  iteration: z.number().int().nonnegative(),
  turnId: z.string().min(1),
});
const toolResultSchema = z.object({
  callId: z.string().min(1),
  toolName: z.string().min(1),
  content: z.string(),
  error: z.boolean(),
});
const fileSchema = z.object({
  type: z.enum(['image', 'file', 'audio']),
  fileId: z.string().optional(),
  url: z.string().optional(),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  metadata: jsonObjectSchema.optional(),
});
const messageToolCallSchema = z.object({
  toolName: z.string(),
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  args: jsonObjectSchema,
  status: z.enum(['completed', 'pending', 'rejected', 'failed']).optional(),
  preview: jsonObjectSchema.nullable().optional(),
});
const messageSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  files: z.array(fileSchema).nullable(),
  toolCalls: z.array(messageToolCallSchema).nullable(),
  reasoning: z.string().nullable(),
  parentMessageId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
const chatSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Chat>;
const startContextSchema = z.object({
  chatId: z.string().min(1),
  kind: z.enum(['send', 'start', 'regenerate']),
  userMessageId: z.string().min(1).nullable(),
  targetAssistantMessageId: z.string().min(1).nullable(),
  requestContext: jsonObjectSchema,
});
const checkpointSchema = turnSchema.extend({
  assistantMessage: messageSchema,
  pendingToolCallIds: z.array(z.string().min(1)),
});
const terminalMetadataSchema = turnSchema.extend({
  assistantMessage: messageSchema.optional(),
  errorCategory: z.string().optional(),
  errorMessage: z.string().optional(),
  cancelledAt: z.string().optional(),
});

const durablePayloadSchemas = {
  'generation.started': z.object({
    type: z.literal('generation.started'),
    context: startContextSchema,
  }),
  'generation.accepted': z.object({
    type: z.literal('generation.accepted'),
    chatId: z.string().min(1),
    chat: chatSchema,
    userMessage: messageSchema.nullable(),
  }),
  'generation.phase_changed': z.object({
    type: z.literal('generation.phase_changed'),
    phase: z.enum(['preparing', 'running', 'awaiting_confirmation', 'saving', 'cancel_requested']),
  }),
  'generation.cancel_requested': z.object({
    type: z.literal('generation.cancel_requested'),
    requestedAt: z.string(),
    requestedBy: z.string().min(1),
  }),
  'generation.checkpointed': z.object({
    type: z.literal('generation.checkpointed'),
    checkpoint: checkpointSchema,
  }),
  'generation.retry_scheduled': z.object({
    type: z.literal('generation.retry_scheduled'),
    ...turnSchema.shape,
    operation: z.enum(['provider', 'tool']),
    attempt: z.number().int().positive(),
    maxAttempts: z.number().int().positive(),
    retryAt: z.string(),
    errorCategory: z.string(),
  }),
  'tool.requested': z.object({ type: z.literal('tool.requested'), call: toolCallSchema }),
  'tool.completed': z.object({ type: z.literal('tool.completed'), result: toolResultSchema }),
  'tool.failed': z.object({ type: z.literal('tool.failed'), result: toolResultSchema }),
  'confirmation.required': z.object({
    type: z.literal('confirmation.required'),
    ...turnSchema.shape,
    messageId: z.string().min(1),
    toolCallId: z.string().min(1),
    toolName: z.string().min(1),
    args: jsonObjectSchema,
    preview: jsonObjectSchema.nullable(),
  }),
  'confirmation.approved': z.object({
    type: z.literal('confirmation.approved'),
    ...turnSchema.shape,
    callId: z.string().min(1),
  }),
  'confirmation.rejected': z.object({
    type: z.literal('confirmation.rejected'),
    ...turnSchema.shape,
    callId: z.string().min(1),
    reason: z.string(),
  }),
  'generation.committed': z.object({
    type: z.literal('generation.committed'),
    metadata: terminalMetadataSchema.optional(),
    message: messageSchema,
  }),
  'generation.cancelled': z.object({
    type: z.literal('generation.cancelled'),
    metadata: terminalMetadataSchema.optional(),
  }),
  'generation.failed': z.object({
    type: z.literal('generation.failed'),
    message: z.string(),
    metadata: terminalMetadataSchema.optional(),
  }),
};

const durableEnvelope = <TType extends string, T extends z.ZodType>(type: TType, payload: T) =>
  z.object({
    version: z.literal(GENERATION_EVENT_VERSION),
    generationId: z.string().min(1),
    sequence: z.number().int().positive().safe(),
    type: z.literal(type),
    payload,
  });

export const GenerationDomainEventSchema = z.discriminatedUnion('type', [
  durableEnvelope('generation.started', durablePayloadSchemas['generation.started']),
  durableEnvelope('generation.accepted', durablePayloadSchemas['generation.accepted']),
  durableEnvelope('generation.phase_changed', durablePayloadSchemas['generation.phase_changed']),
  durableEnvelope(
    'generation.cancel_requested',
    durablePayloadSchemas['generation.cancel_requested'],
  ),
  durableEnvelope('generation.checkpointed', durablePayloadSchemas['generation.checkpointed']),
  durableEnvelope(
    'generation.retry_scheduled',
    durablePayloadSchemas['generation.retry_scheduled'],
  ),
  durableEnvelope('tool.requested', durablePayloadSchemas['tool.requested']),
  durableEnvelope('tool.completed', durablePayloadSchemas['tool.completed']),
  durableEnvelope('tool.failed', durablePayloadSchemas['tool.failed']),
  durableEnvelope('confirmation.required', durablePayloadSchemas['confirmation.required']),
  durableEnvelope('confirmation.approved', durablePayloadSchemas['confirmation.approved']),
  durableEnvelope('confirmation.rejected', durablePayloadSchemas['confirmation.rejected']),
  durableEnvelope('generation.committed', durablePayloadSchemas['generation.committed']),
  durableEnvelope('generation.cancelled', durablePayloadSchemas['generation.cancelled']),
  durableEnvelope('generation.failed', durablePayloadSchemas['generation.failed']),
]);

export type GenerationDomainEventPayload = {
  [Key in keyof typeof durablePayloadSchemas]: z.infer<(typeof durablePayloadSchemas)[Key]>;
}[keyof typeof durablePayloadSchemas];

export type GenerationDomainEvent = {
  [Payload in GenerationDomainEventPayload as Payload['type']]: {
    version: 1;
    generationId: string;
    sequence: number;
    type: Payload['type'];
    payload: Payload;
  };
}[GenerationDomainEventPayload['type']];

const liveEventPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('error'), message: z.string().min(1) }),
  z.object({ type: z.literal('text-delta'), text: z.string() }),
  z.object({ type: z.literal('reasoning-delta'), text: z.string() }),
  z.object({
    type: z.literal('tool-step'),
    toolCallId: z.string().min(1),
    toolName: z.string().min(1),
    status: z.enum(['requested', 'running', 'completed', 'failed', 'reused']),
  }),
  z.object({
    type: z.literal('phase-changed'),
    phase: z.enum([
      'preparing',
      'running',
      'awaiting_confirmation',
      'saving',
      'cancel_requested',
      'committed',
      'cancelled',
      'failed',
    ]),
  }),
]);

export const GenerationLiveEventSchema = z.object({
  version: z.literal(GENERATION_EVENT_VERSION),
  generationId: z.string().min(1),
  event: liveEventPayloadSchema,
});

export type GenerationLiveEvent = z.infer<typeof GenerationLiveEventSchema>;
export type GenerationLiveEventPayload = GenerationLiveEvent['event'];

// anything that can show up on the generation SSE wire: durable replay events plus live broadcasts
export type GenerationWireEvent = GenerationDomainEvent | GenerationLiveEvent;

export const GenerationWireEventSchema = z.union([
  GenerationDomainEventSchema,
  GenerationLiveEventSchema,
]);

export function parseGenerationDomainEvent(input: unknown): GenerationDomainEvent {
  return GenerationDomainEventSchema.parse(input);
}

export function parseGenerationLiveEvent(input: unknown): GenerationLiveEvent {
  return GenerationLiveEventSchema.parse(input);
}

export function parseGenerationWireEvent(input: unknown): GenerationWireEvent {
  return GenerationWireEventSchema.parse(input);
}

// dedupes durable events by sequence so replay + live doesn't double-fire; live events
// have no sequence number so they always pass through
export function createGenerationEventDeduplicator(): (
  event: GenerationWireEvent,
) => GenerationWireEvent | null {
  const seenDurableEvents = new Set<string>();
  return (event) => {
    if ('sequence' in event) {
      const key = `${event.generationId}:${event.sequence}`;
      if (seenDurableEvents.has(key)) return null;
      seenDurableEvents.add(key);
    }
    return event;
  };
}

export function getGenerationFailureMessage(event: GenerationWireEvent): string | null {
  if ('payload' in event && event.type === 'generation.failed') return event.payload.message;
  if ('event' in event && event.event.type === 'error') return event.event.message;
  return null;
}

export function legacyEventToLiveEvent(event: LegacyChatStreamEvent): GenerationLiveEvent | null {
  switch (event.type) {
    case 'phase':
      return {
        version: GENERATION_EVENT_VERSION,
        generationId: event.generationId,
        event: { type: 'phase-changed', phase: 'running' },
      };
    case 'tool-step':
      return {
        version: GENERATION_EVENT_VERSION,
        generationId: event.generationId,
        event: {
          type: 'tool-step',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          status: event.status,
        },
      };
    case 'text-delta':
      return {
        version: GENERATION_EVENT_VERSION,
        generationId: event.generationId,
        event: { type: 'text-delta', text: event.text },
      };
    case 'reasoning-delta':
      return {
        version: GENERATION_EVENT_VERSION,
        generationId: event.generationId,
        event: { type: 'reasoning-delta', text: event.text },
      };
    default:
      return null;
  }
}

export type { ChatGenerationKind, GenerationPhase, GenerationToolCall, ToolResult };
