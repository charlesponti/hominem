// Runtime schemas for the generation machine's event contract. Each one is
// `satisfies`-checked against the hand-written type it mirrors in
// generation-machine/types.ts and generation-events.ts, so if either shape
// changes you get a compile error here instead of silent drift. Exported
// separately via the `./schemas` subpath so consumers can validate the wire
// contract without pulling in the whole generation engine.
import { z } from 'zod';

export const chatMessageJsonObjectSchema = z.record(z.string(), z.json());
export type ChatMessageJsonObject = z.infer<typeof chatMessageJsonObjectSchema>;

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

import type {
  GenerationCheckpoint,
  GenerationMessageSnapshot,
  GenerationRequestContext,
  GenerationRetryMetadata,
  GenerationStartContext,
  GenerationTerminalMetadata,
  GenerationTurn,
} from './generation-events';
import type {
  GenerationHistoryEvent,
  GenerationHistoryEventPayload,
  GenerationStreamEvent,
  GenerationStreamEventPayload,
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

const messageSnapshotSchema = z.object({
  id: z.string().min(1),
  chatId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  reasoning: z.string().nullable().optional(),
}) satisfies z.ZodType<GenerationMessageSnapshot>;

const startContextSchema = z.object({
  chatId: z.string().min(1),
  kind: z.enum(['send', 'start', 'regenerate']),
  userMessageId: z.string().min(1).nullable(),
  targetAssistantMessageId: z.string().min(1).nullable(),
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
    userMessage: messageSnapshotSchema.nullable(),
  }) satisfies z.ZodType<HistoryPayload<'generation.accepted'>>,
  'generation.phase_changed': z.object({
    type: z.literal('generation.phase_changed'),
    phase: z.enum(['preparing', 'running', 'awaiting_confirmation', 'saving', 'cancel_requested']),
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

const historyEnvelope = <TType extends GenerationHistoryEventPayload['type']>(
  type: TType,
  payload: (typeof historySchemas)[TType],
) =>
  z.object({
    version: z.literal(GENERATION_EVENT_VERSION),
    generationId: z.string().min(1),
    sequence: z.number().int().positive().safe(),
    type: z.literal(type),
    payload,
  });

export const GenerationHistoryEventSchema = z.discriminatedUnion('type', [
  historyEnvelope('generation.started', historySchemas['generation.started']),
  historyEnvelope('generation.accepted', historySchemas['generation.accepted']),
  historyEnvelope('generation.phase_changed', historySchemas['generation.phase_changed']),
  historyEnvelope('generation.cancel_requested', historySchemas['generation.cancel_requested']),
  historyEnvelope('generation.checkpointed', historySchemas['generation.checkpointed']),
  historyEnvelope('tool.requested', historySchemas['tool.requested']),
  historyEnvelope('tool.completed', historySchemas['tool.completed']),
  historyEnvelope('tool.failed', historySchemas['tool.failed']),
  historyEnvelope('confirmation.required', historySchemas['confirmation.required']),
  historyEnvelope('confirmation.approved', historySchemas['confirmation.approved']),
  historyEnvelope('confirmation.rejected', historySchemas['confirmation.rejected']),
  historyEnvelope('generation.retry_scheduled', historySchemas['generation.retry_scheduled']),
  historyEnvelope('generation.committed', historySchemas['generation.committed']),
  historyEnvelope('generation.cancelled', historySchemas['generation.cancelled']),
  historyEnvelope('generation.failed', historySchemas['generation.failed']),
]) satisfies z.ZodType<GenerationHistoryEvent>;

export const GenerationStreamEventPayloadSchema = z.discriminatedUnion('type', [
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
  z.object({ type: z.literal('error'), message: z.string().min(1) }),
]) satisfies z.ZodType<GenerationStreamEventPayload>;

export const GenerationStreamEventSchema = z.object({
  version: z.literal(GENERATION_EVENT_VERSION),
  generationId: z.string().min(1),
  event: GenerationStreamEventPayloadSchema,
}) satisfies z.ZodType<GenerationStreamEvent>;

export function parseGenerationHistoryEventPayload(input: unknown): GenerationHistoryEventPayload {
  return GenerationHistoryEventPayloadSchema.parse(input);
}

export function parseGenerationHistoryEvent(input: unknown): GenerationHistoryEvent {
  return GenerationHistoryEventSchema.parse(input);
}

export function parseGenerationStreamEvent(input: unknown): GenerationStreamEvent {
  return GenerationStreamEventSchema.parse(input);
}
