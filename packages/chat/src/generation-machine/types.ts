/**
 * Provider- and transport-independent generation state machine types.
 *
 * The machine is deliberately synchronous and side-effect free. An adapter
 * turns its commands into provider, tool, persistence, and delivery effects.
 */

import type {
  GenerationCheckpoint,
  GenerationMessageSnapshot,
  GenerationRequestContext,
  GenerationRetryMetadata,
  GenerationStartContext,
  GenerationTerminalMetadata,
} from '../generation-events';

export type GenerationPhase =
  | 'preparing'
  | 'running'
  | 'awaiting_confirmation'
  | 'saving'
  | 'cancel_requested'
  | 'committed'
  | 'cancelled'
  | 'failed';

export type GenerationActivePhase =
  | 'preparing'
  | 'running'
  | 'awaiting_confirmation'
  | 'saving'
  | 'cancel_requested';

export type ChatGenerationKind = 'send' | 'start' | 'regenerate';
export type ChatGenerationStatus = GenerationPhase | 'queued';

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
  function?: { name?: string | null; arguments?: string | null } | null;
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

export type GenerationState = {
  generationId: string;
  phase: GenerationPhase;
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

export type GenerationEventPayload =
  | {
      type: 'generation.started';
      context: GenerationStartContext;
    }
  | {
      type: 'generation.accepted';
      chatId: string;
      userMessage: GenerationMessageSnapshot | null;
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
      message: GenerationMessageSnapshot;
      metadata?: GenerationTerminalMetadata;
    }
  | { type: 'generation.cancelled'; metadata?: GenerationTerminalMetadata }
  | { type: 'generation.failed'; message: string; metadata?: GenerationTerminalMetadata };

export type GenerationEventType = GenerationEventPayload['type'];

export type GenerationDomainEvent = {
  [Payload in GenerationEventPayload as Payload['type']]: {
    version: 1;
    generationId: string;
    sequence: number;
    type: Payload['type'];
    payload: Payload;
  };
}[GenerationEventType];

export type GenerationLiveEventPayload =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | {
      type: 'tool-step';
      toolCallId: string;
      toolName: string;
      status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
    }
  | { type: 'phase-changed'; phase: GenerationPhase };

export type GenerationLiveEvent = {
  version: 1;
  generationId: string;
  event: GenerationLiveEventPayload;
};

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
  | { type: 'generation-saved'; message: GenerationMessageSnapshot }
  | { type: 'generation-failed'; message: string };

export type GenerationCommand =
  | { type: 'persist'; event: GenerationEventPayload; idempotencyKey: string }
  | { type: 'emit'; event: GenerationLiveEventPayload }
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
};
