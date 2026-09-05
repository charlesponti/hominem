// @hominem/chat/types — a types-only barrel for environments that just need the contracts
export * from './chat.types';
export type { ChatMessageFileRecord, ChatMessageToolCallRecord } from './generation-schemas';
export * from './capture-types';
export * from './generation-events';
export type {
  ChatGenerationKind,
  GenerationActivePhase,
  GenerationDeltaEventPayload,
  GenerationEvent,
  GenerationEffectStore,
  GenerationHistoryEvent,
  GenerationHistoryEventPayload,
  GenerationHistoryEventType,
  GenerationInput,
  GenerationLifecycleState,
  GenerationPhase,
  GenerationState,
  GenerationStep,
  GenerationToolCall,
  ProviderChunk,
  ProviderToolCallDelta,
  ToolResult,
} from './generation-machine';
