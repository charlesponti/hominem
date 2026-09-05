// Types for the provider/transport-independent generation state machine.
// It's deliberately synchronous and side-effect free — an adapter turns its
// commands into actual provider, tool, persistence, and delivery effects.

import type { z } from 'zod';

import type {
  GenerationCheckpoint,
  GenerationRequestContext,
  GenerationRetryMetadata,
  GenerationStartContext,
  GenerationTerminalMetadata,
} from '../generation-events';
import type { chatGenerationKindSchema, chatGenerationStatusSchema } from '../generation-schemas';
import type { ChatMessageSnapshot } from '../generation-schemas';

export type GenerationPhase = z.infer<typeof chatGenerationStatusSchema>;

export type GenerationActivePhase = Exclude<GenerationPhase, 'committed' | 'cancelled' | 'failed'>;

export type ChatGenerationKind = z.infer<typeof chatGenerationKindSchema>;

export type GenerationToolCall = {
  id: string;
  name: string;
  arguments: string;
  iteration: number;
  turnId: string;
  messageId?: string;
  preview?: GenerationRequestContext | null;
};

export type ProviderToolCallDelta = {
  index: number;
  id?: string | null;
  type?: 'function';
  function?: { name?: string | null; arguments?: string | null } | null;
};

export type ProviderToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ProviderChunk = {
  content?: string | null;
  reasoning?: string | null;
  toolCalls?: readonly ProviderToolCallDelta[];
};

export type ToolResult = {
  callId: string;
  toolName: string;
  content: string;
  error: boolean;
};

export type GenerationEffectStore = {
  get: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
  }) => Promise<ToolResult | null>;
  save: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
    result: ToolResult;
  }) => Promise<ToolResult>;
};

export type GenerationLifecycleState = {
  generationId: string;
  phase: GenerationPhase;
};

export type GenerationState = GenerationLifecycleState & {
  iteration: number;
  turnId: string | null;
  assistantText: string;
  reasoningText: string;
  requestedToolCalls: readonly GenerationToolCall[];
  toolCalls: readonly GenerationToolCall[];
  pendingToolCalls: readonly GenerationToolCall[];
  completedToolResults: readonly ToolResult[];
  activeToolCall: GenerationToolCall | null;
  pendingConfirmation: GenerationToolCall | null;
  lastError: string | null;
};

// The single canonical event vocabulary — every fact this system can report
// about a generation, whether durably persisted (everything except the two
// delta variants) or purely ephemeral (text-delta/reasoning-delta, which
// exist only to stream tokens and are never persisted or replayed).
// GenerationHistoryEventPayload/GenerationDeltaEventPayload below are
// *derived* subsets, not hand-maintained parallel unions, so there's
// exactly one place that declares "what is an event" in this system.
export type GenerationEventPayload =
  | {
      type: 'generation.started';
      context: GenerationStartContext;
    }
  | {
      type: 'generation.accepted';
      chatId: string;
      chat: import('../generation-schemas').ChatSnapshot;
      userMessage: ChatMessageSnapshot | null;
    }
  | { type: 'generation.phase_changed'; phase: GenerationActivePhase }
  | { type: 'generation.cancel_requested'; requestedAt: string; requestedBy: string }
  | { type: 'generation.checkpointed'; checkpoint: GenerationCheckpoint }
  | { type: 'tool.requested'; call: GenerationToolCall }
  | { type: 'tool.completed'; result: ToolResult }
  | { type: 'tool.failed'; result: ToolResult }
  | { type: 'confirmation.required'; call: GenerationToolCall }
  | { type: 'confirmation.approved'; callId: string; call?: GenerationToolCall }
  | { type: 'confirmation.rejected'; callId: string; reason: string; call?: GenerationToolCall }
  | {
      type: 'generation.retry_scheduled';
      attempt: number;
      maxAttempts: number;
      metadata?: GenerationRetryMetadata;
    }
  | {
      type: 'generation.committed';
      message: ChatMessageSnapshot;
      metadata?: GenerationTerminalMetadata;
    }
  | { type: 'generation.cancelled'; metadata?: GenerationTerminalMetadata }
  | { type: 'generation.failed'; message: string; metadata?: GenerationTerminalMetadata }
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string };

const DELTA_EVENT_TYPES = ['text-delta', 'reasoning-delta'] as const;
export type DeltaEventType = (typeof DELTA_EVENT_TYPES)[number];

// Persistable facts — everything the DB event log and the `persist` command
// can carry. Derived, not hand-written: adding a new durable event type
// only ever means adding one variant to GenerationEventPayload above.
export type GenerationHistoryEventPayload = Exclude<
  GenerationEventPayload,
  { type: DeltaEventType }
>;

// Ephemeral, never-persisted token deltas — everything the `emit` command
// can carry (after the collapse below, that's *only* these two).
export type GenerationDeltaEventPayload = Extract<GenerationEventPayload, { type: DeltaEventType }>;

export type GenerationHistoryEventType = GenerationHistoryEventPayload['type'];

// One envelope shape for every event on the wire: `sequence` is a real
// number for persisted (history) events and `null` for deltas, which are
// never assigned a sequence. Parameterized so GenerationEvent (the full
// union) and GenerationHistoryEvent (the persisted subset, sequence always
// a number) both come from the same construction.
type GenerationEventFor<Payload extends GenerationEventPayload> = {
  [P in Payload as P['type']]: {
    version: 1;
    generationId: string;
    sequence: P['type'] extends DeltaEventType ? null : number;
    type: P['type'];
    payload: P;
  };
}[Payload['type']];

export type GenerationEvent = GenerationEventFor<GenerationEventPayload>;
export type GenerationHistoryEvent = GenerationEventFor<GenerationHistoryEventPayload>;

export type GenerationInput =
  | { type: 'start'; turnId: string; context: GenerationStartContext }
  | { type: 'provider-chunk'; chunk: ProviderChunk }
  | {
      type: 'provider-turn-completed';
      requiredToolCall: boolean;
      confirmationCallIds: readonly string[];
    }
  | {
      type: 'provider-turn-failed';
      message: string;
      transient: boolean;
      attempt: number;
      maxAttempts: number;
    }
  | { type: 'tool-result'; result: ToolResult }
  | { type: 'confirmation-approved'; callId: string }
  | { type: 'confirmation-rejected'; callId: string; reason: string }
  | { type: 'cancel-requested' }
  | { type: 'effect-stopped' }
  | { type: 'generation-saved'; message: ChatMessageSnapshot }
  | { type: 'generation-failed'; message: string };

export type GenerationCommand =
  | { type: 'persist'; event: GenerationHistoryEventPayload; idempotencyKey: string }
  | { type: 'emit'; event: GenerationDeltaEventPayload }
  | { type: 'open-provider-turn'; turnId: string; iteration: number }
  | { type: 'execute-tool'; call: GenerationToolCall; idempotencyKey: string }
  | { type: 'preview-tool'; call: GenerationToolCall; idempotencyKey: string }
  | { type: 'retry-provider'; attempt: number }
  | { type: 'save-generation' }
  | { type: 'stop-effects' };

export type GenerationStep = { state: GenerationState; commands: readonly GenerationCommand[] };

export type GenerationEffectResult =
  | GenerationInput
  | AsyncIterable<GenerationInput>
  | GenerationInput[]
  | undefined;

export type GenerationEffectInterpreter = {
  execute: (command: GenerationCommand, state: GenerationState) => Promise<GenerationEffectResult>;
};

export type RunGenerationInput = {
  generationId: string;
  effects: GenerationEffectInterpreter;
  startContext: GenerationStartContext;
  initialInput?: GenerationInput;
  initialState?: GenerationState;
};
