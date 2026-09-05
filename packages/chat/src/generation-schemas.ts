// Runtime schemas for the generation machine's event contract. Each one is
// `satisfies`-checked against the hand-written type it mirrors in
// generation-machine/types.ts and generation-events.ts, so if either shape
// changes you get a compile error here instead of silent drift. Exported
// separately via the `./schemas` subpath so consumers can validate the wire
// contract without pulling in the whole generation engine.
import { z } from 'zod';

export const chatMessageJsonObjectSchema = z.record(z.string(), z.json());
export type ChatMessageJsonObject = z.infer<typeof chatMessageJsonObjectSchema>;

export const chatGenerationKindSchema = z.enum(['send', 'start', 'regenerate']);
export const chatGenerationStatusSchema = z.enum([
  'preparing',
  'running',
  'awaiting_confirmation',
  'saving',
  'cancel_requested',
  'committed',
  'cancelled',
  'failed',
]);
export const chatGenerationActiveStatusSchema = chatGenerationStatusSchema.exclude([
  'committed',
  'cancelled',
  'failed',
]);

export const generationClientCheckpointSchema = z
  .object({
    generationId: z.string().min(1),
    phase: chatGenerationStatusSchema,
    lastDurableSequence: z.number().int().nonnegative().safe(),
  })
  .strict();

export type GenerationClientCheckpoint = z.infer<typeof generationClientCheckpointSchema>;

export const providerToolCallDeltaSchema = z
  .object({
    index: z.number().int().nonnegative(),
    id: z.string().nullable().optional(),
    type: z.literal('function').optional(),
    function: z
      .object({
        name: z.string().nullable().optional(),
        arguments: z.string().nullable().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export const providerChunkSchema = z
  .object({
    content: z.string().nullable().optional(),
    reasoning: z.string().nullable().optional(),
    toolCalls: z.array(providerToolCallDeltaSchema).optional(),
  })
  .strict();

export const chatMessageFileSchema = z
  .object({
    type: z.enum(['image', 'file', 'audio']),
    fileId: z.string().optional(),
    url: z.string().optional(),
    filename: z.string().optional(),
    mimeType: z.string().optional(),
    size: z.number().finite().nonnegative().optional(),
    metadata: chatMessageJsonObjectSchema.optional(),
  })
  .strict();

export const chatMessageToolCallSchema = z
  .object({
    toolName: z.string().min(1),
    type: z.literal('tool-call'),
    toolCallId: z.string().min(1),
    args: chatMessageJsonObjectSchema,
    confirmationStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
    executionStatus: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
    preview: chatMessageJsonObjectSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.confirmationStatus === 'pending' &&
      ['completed', 'failed'].includes(value.executionStatus ?? '')
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Awaiting confirmation cannot be terminal',
      });
    }
    if (
      value.confirmationStatus === 'rejected' &&
      ['running', 'completed', 'failed'].includes(value.executionStatus ?? '')
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Rejected tools cannot execute' });
    }
  });

export const chatMessageFilesSchema = z.array(chatMessageFileSchema).nullable();
export const chatMessageToolCallsSchema = z.array(chatMessageToolCallSchema).nullable();

export type ChatMessageFileRecord = z.infer<typeof chatMessageFileSchema>;
export type ChatMessageToolCallRecord = z.infer<typeof chatMessageToolCallSchema>;

export const chatSnapshotSchema = z
  .object({
    id: z.string().min(1),
    userId: z.string().min(1),
    title: z.string(),
    archivedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const chatMessageSnapshotSchema = z
  .object({
    id: z.string().min(1),
    chatId: z.string().min(1),
    userId: z.string().min(1),
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
    files: chatMessageFilesSchema,
    toolCalls: chatMessageToolCallsSchema,
    reasoning: z.string().nullable(),
    parentMessageId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type ChatSnapshot = z.infer<typeof chatSnapshotSchema>;
export type ChatMessageSnapshot = z.infer<typeof chatMessageSnapshotSchema>;

import type {
  GenerationCheckpoint,
  GenerationRequestContext,
  GenerationRetryMetadata,
  GenerationStartContext,
  GenerationTerminalMetadata,
  GenerationTurn,
} from './generation-events';
import type {
  DeltaEventType,
  GenerationDeltaEventPayload,
  GenerationEvent,
  GenerationHistoryEvent,
  GenerationHistoryEventPayload,
  GenerationToolCall,
  ToolResult,
} from './generation-machine';

export const GENERATION_EVENT_VERSION = 1;

type HistoryPayload<T extends GenerationHistoryEventPayload['type']> = Extract<
  GenerationHistoryEventPayload,
  { type: T }
>;

const requestContextSchema = z.record(z.string(), z.json()) satisfies z.ZodType<
  GenerationRequestContext | Record<string, unknown>
>;

const turnSchema = z.object({
  turnId: z.string().min(1),
  iteration: z.number().int().nonnegative(),
}) satisfies z.ZodType<GenerationTurn>;

const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.string(),
  iteration: z.number().int().nonnegative(),
  turnId: z.string().min(1),
  messageId: z.string().min(1).optional(),
  preview: requestContextSchema.nullable().optional(),
}) satisfies z.ZodType<GenerationToolCall>;

const toolResultSchema = z.object({
  callId: z.string().min(1),
  toolName: z.string().min(1),
  content: z.string(),
  error: z.boolean(),
}) satisfies z.ZodType<ToolResult>;

const messageSnapshotSchema = chatMessageSnapshotSchema;

const startContextSchema = z.object({
  chatId: z.string().min(1),
  kind: chatGenerationKindSchema,
  userMessageId: z.string().min(1).nullable(),
  targetAssistantMessageId: z.string().min(1).nullable(),
  retryOfGenerationId: z.string().min(1).optional(),
  requestContext: requestContextSchema,
}) satisfies z.ZodType<GenerationStartContext>;

const checkpointSchema = turnSchema.extend({
  assistantMessage: messageSnapshotSchema,
  pendingToolCallIds: z.array(z.string().min(1)),
}) satisfies z.ZodType<GenerationCheckpoint>;

const retryMetadataSchema = turnSchema.extend({
  operation: z.enum(['provider', 'tool']),
  attempt: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  retryAt: z.string(),
  errorCategory: z.string(),
}) satisfies z.ZodType<GenerationRetryMetadata>;

const terminalMetadataSchema = turnSchema.extend({
  assistantMessage: messageSnapshotSchema.optional(),
  errorCategory: z.string().optional(),
  errorMessage: z.string().optional(),
  cancelledAt: z.string().optional(),
}) satisfies z.ZodType<GenerationTerminalMetadata>;

const historySchemas = {
  'generation.started': z.object({
    type: z.literal('generation.started'),
    context: startContextSchema,
  }) satisfies z.ZodType<HistoryPayload<'generation.started'>>,
  'generation.accepted': z.object({
    type: z.literal('generation.accepted'),
    chatId: z.string().min(1),
    chat: chatSnapshotSchema,
    userMessage: messageSnapshotSchema.nullable(),
  }) satisfies z.ZodType<HistoryPayload<'generation.accepted'>>,
  'generation.phase_changed': z.object({
    type: z.literal('generation.phase_changed'),
    phase: chatGenerationActiveStatusSchema,
  }) satisfies z.ZodType<HistoryPayload<'generation.phase_changed'>>,
  'generation.cancel_requested': z.object({
    type: z.literal('generation.cancel_requested'),
    requestedAt: z.string(),
    requestedBy: z.string().min(1),
  }) satisfies z.ZodType<HistoryPayload<'generation.cancel_requested'>>,
  'generation.checkpointed': z.object({
    type: z.literal('generation.checkpointed'),
    checkpoint: checkpointSchema,
  }) satisfies z.ZodType<HistoryPayload<'generation.checkpointed'>>,
  'tool.requested': z.object({
    type: z.literal('tool.requested'),
    call: toolCallSchema,
  }) satisfies z.ZodType<HistoryPayload<'tool.requested'>>,
  'tool.completed': z.object({
    type: z.literal('tool.completed'),
    result: toolResultSchema,
  }) satisfies z.ZodType<HistoryPayload<'tool.completed'>>,
  'tool.failed': z.object({
    type: z.literal('tool.failed'),
    result: toolResultSchema,
  }) satisfies z.ZodType<HistoryPayload<'tool.failed'>>,
  'confirmation.required': z.object({
    type: z.literal('confirmation.required'),
    call: toolCallSchema,
  }) satisfies z.ZodType<HistoryPayload<'confirmation.required'>>,
  'confirmation.approved': z.object({
    type: z.literal('confirmation.approved'),
    callId: z.string().min(1),
    call: toolCallSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'confirmation.approved'>>,
  'confirmation.rejected': z.object({
    type: z.literal('confirmation.rejected'),
    callId: z.string().min(1),
    reason: z.string(),
    call: toolCallSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'confirmation.rejected'>>,
  'generation.retry_scheduled': z.object({
    type: z.literal('generation.retry_scheduled'),
    attempt: z.number().int().positive(),
    maxAttempts: z.number().int().positive(),
    metadata: retryMetadataSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'generation.retry_scheduled'>>,
  'generation.committed': z.object({
    type: z.literal('generation.committed'),
    message: messageSnapshotSchema,
    metadata: terminalMetadataSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'generation.committed'>>,
  'generation.cancelled': z.object({
    type: z.literal('generation.cancelled'),
    metadata: terminalMetadataSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'generation.cancelled'>>,
  'generation.failed': z.object({
    type: z.literal('generation.failed'),
    message: z.string(),
    metadata: terminalMetadataSchema.optional(),
  }) satisfies z.ZodType<HistoryPayload<'generation.failed'>>,
} as const;

export const GenerationHistoryEventPayloadSchema = z.discriminatedUnion('type', [
  historySchemas['generation.started'],
  historySchemas['generation.accepted'],
  historySchemas['generation.phase_changed'],
  historySchemas['generation.cancel_requested'],
  historySchemas['generation.checkpointed'],
  historySchemas['tool.requested'],
  historySchemas['tool.completed'],
  historySchemas['tool.failed'],
  historySchemas['confirmation.required'],
  historySchemas['confirmation.approved'],
  historySchemas['confirmation.rejected'],
  historySchemas['generation.retry_scheduled'],
  historySchemas['generation.committed'],
  historySchemas['generation.cancelled'],
  historySchemas['generation.failed'],
]) satisfies z.ZodType<GenerationHistoryEventPayload>;

// Two small envelope factories — one per sequence shape — rather than one
// generic with a runtime type check, so `sequence`'s type (number vs null)
// stays a compile-time guarantee instead of a cast.
const historyEventEnvelope = <TType extends GenerationHistoryEventPayload['type']>(
  type: TType,
  payload: z.ZodType<Extract<GenerationHistoryEventPayload, { type: TType }>>,
) =>
  z.object({
    version: z.literal(GENERATION_EVENT_VERSION),
    generationId: z.string().min(1),
    sequence: z.number().int().positive().safe(),
    type: z.literal(type),
    payload,
  });

const deltaEventEnvelope = <TType extends DeltaEventType>(
  type: TType,
  payload: z.ZodType<Extract<GenerationDeltaEventPayload, { type: TType }>>,
) =>
  z.object({
    version: z.literal(GENERATION_EVENT_VERSION),
    generationId: z.string().min(1),
    sequence: z.null(),
    type: z.literal(type),
    payload,
  });

export const GenerationHistoryEventSchema = z.discriminatedUnion('type', [
  historyEventEnvelope('generation.started', historySchemas['generation.started']),
  historyEventEnvelope('generation.accepted', historySchemas['generation.accepted']),
  historyEventEnvelope('generation.phase_changed', historySchemas['generation.phase_changed']),
  historyEventEnvelope(
    'generation.cancel_requested',
    historySchemas['generation.cancel_requested'],
  ),
  historyEventEnvelope('generation.checkpointed', historySchemas['generation.checkpointed']),
  historyEventEnvelope('tool.requested', historySchemas['tool.requested']),
  historyEventEnvelope('tool.completed', historySchemas['tool.completed']),
  historyEventEnvelope('tool.failed', historySchemas['tool.failed']),
  historyEventEnvelope('confirmation.required', historySchemas['confirmation.required']),
  historyEventEnvelope('confirmation.approved', historySchemas['confirmation.approved']),
  historyEventEnvelope('confirmation.rejected', historySchemas['confirmation.rejected']),
  historyEventEnvelope('generation.retry_scheduled', historySchemas['generation.retry_scheduled']),
  historyEventEnvelope('generation.committed', historySchemas['generation.committed']),
  historyEventEnvelope('generation.cancelled', historySchemas['generation.cancelled']),
  historyEventEnvelope('generation.failed', historySchemas['generation.failed']),
]) satisfies z.ZodType<GenerationHistoryEvent>;

const deltaSchemas = {
  'text-delta': z.object({ type: z.literal('text-delta'), text: z.string() }),
  'reasoning-delta': z.object({ type: z.literal('reasoning-delta'), text: z.string() }),
} satisfies { [T in DeltaEventType]: z.ZodType<Extract<GenerationDeltaEventPayload, { type: T }>> };

export const GenerationDeltaEventPayloadSchema = z.discriminatedUnion('type', [
  deltaSchemas['text-delta'],
  deltaSchemas['reasoning-delta'],
]) satisfies z.ZodType<GenerationDeltaEventPayload>;

const GenerationDeltaEventSchema = z.discriminatedUnion('type', [
  deltaEventEnvelope('text-delta', deltaSchemas['text-delta']),
  deltaEventEnvelope('reasoning-delta', deltaSchemas['reasoning-delta']),
]);

// The single canonical wire schema — every event this system can send,
// persisted or ephemeral, in one envelope shape.
export const GenerationEventSchema = z.union([
  GenerationHistoryEventSchema,
  GenerationDeltaEventSchema,
]) satisfies z.ZodType<GenerationEvent>;

export function parseGenerationHistoryEventPayload(input: unknown): GenerationHistoryEventPayload {
  return GenerationHistoryEventPayloadSchema.parse(input);
}

export function parseGenerationHistoryEvent(input: unknown): GenerationHistoryEvent {
  return GenerationHistoryEventSchema.parse(input);
}

export function parseGenerationEvent(input: unknown): GenerationEvent {
  return GenerationEventSchema.parse(input);
}

// Kept as an alias — this used to be a real union of two distinct envelope
// shapes; now it's just the canonical event schema/type under its
// established name, so the many existing import sites don't need renaming.
export function parseGenerationWireEvent(input: unknown): GenerationEvent {
  return GenerationEventSchema.parse(input);
}

export function createGenerationEventDeduplicator(): (
  event: GenerationEvent,
) => GenerationEvent | null {
  const seenDurableEvents = new Set<string>();
  return (event) => {
    if (event.sequence !== null) {
      const key = `${event.generationId}:${event.sequence}`;
      if (seenDurableEvents.has(key)) return null;
      seenDurableEvents.add(key);
    }
    return event;
  };
}

export function getGenerationFailureMessage(event: GenerationEvent): string | null {
  if (event.type === 'generation.failed') return event.payload.message;
  return null;
}
