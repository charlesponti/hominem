import type {
  GenerationClientErrorEvent,
  GenerationClientInputEvent,
  GenerationDomainEvent as ChatGenerationDomainEvent,
  GenerationLiveEvent as ChatGenerationLiveEvent,
  GenerationMessageSnapshot,
  GenerationTerminalMetadata,
  GenerationToolCall,
} from '@hominem/chat';

import type { ChatMessageDto } from './types/chat.types';
import type { GenerationDomainEvent, GenerationStreamEvent } from './types/generation-events';

function toMessageSnapshot(message: ChatMessageDto): GenerationMessageSnapshot | null {
  if (message.role !== 'user' && message.role !== 'assistant') return null;
  return {
    id: message.id,
    chatId: message.chatId,
    role: message.role,
    content: message.content,
    reasoning: message.reasoning,
  };
}

function toToolCall(call: {
  id: string;
  name: string;
  arguments: string;
  iteration: number;
  turnId: string;
  messageId?: string;
  preview?: GenerationToolCall['preview'];
}): GenerationToolCall {
  return {
    id: call.id,
    name: call.name,
    arguments: call.arguments,
    iteration: call.iteration,
    turnId: call.turnId,
    ...(call.messageId ? { messageId: call.messageId } : {}),
    ...(call.preview !== undefined ? { preview: call.preview } : {}),
  };
}

function toTerminalMetadata(
  metadata:
    | {
        turnId: string;
        iteration: number;
        assistantMessage?: ChatMessageDto;
        errorCategory?: string;
        errorMessage?: string;
        cancelledAt?: string;
      }
    | undefined,
): GenerationTerminalMetadata | undefined {
  if (!metadata) return undefined;
  const assistantMessage = metadata.assistantMessage
    ? toMessageSnapshot(metadata.assistantMessage)
    : null;
  return {
    turnId: metadata.turnId,
    iteration: metadata.iteration,
    ...(assistantMessage ? { assistantMessage } : {}),
    ...(metadata.errorCategory ? { errorCategory: metadata.errorCategory } : {}),
    ...(metadata.errorMessage ? { errorMessage: metadata.errorMessage } : {}),
    ...(metadata.cancelledAt ? { cancelledAt: metadata.cancelledAt } : {}),
  };
}

function durableEvent(
  event: GenerationDomainEvent,
  payload: Exclude<ChatGenerationDomainEvent['payload'], { type: 'generation.accepted' }>,
): ChatGenerationDomainEvent {
  const envelope: { version: 1; generationId: string; sequence: number } = {
    version: 1,
    generationId: event.generationId,
    sequence: event.sequence,
  };
  switch (payload.type) {
    case 'generation.started':
      return { ...envelope, type: 'generation.started', payload };
    case 'generation.phase_changed':
      return { ...envelope, type: 'generation.phase_changed', payload };
    case 'generation.cancel_requested':
      return { ...envelope, type: 'generation.cancel_requested', payload };
    case 'generation.checkpointed':
      return { ...envelope, type: 'generation.checkpointed', payload };
    case 'generation.retry_scheduled':
      return { ...envelope, type: 'generation.retry_scheduled', payload };
    case 'tool.requested':
      return { ...envelope, type: 'tool.requested', payload };
    case 'tool.completed':
      return { ...envelope, type: 'tool.completed', payload };
    case 'tool.failed':
      return { ...envelope, type: 'tool.failed', payload };
    case 'confirmation.required':
      return { ...envelope, type: 'confirmation.required', payload };
    case 'confirmation.approved':
      return { ...envelope, type: 'confirmation.approved', payload };
    case 'confirmation.rejected':
      return { ...envelope, type: 'confirmation.rejected', payload };
    case 'generation.committed':
      return { ...envelope, type: 'generation.committed', payload };
    case 'generation.cancelled':
      return { ...envelope, type: 'generation.cancelled', payload };
    case 'generation.failed':
      return { ...envelope, type: 'generation.failed', payload };
  }
}

function mapDurableEvent(event: GenerationDomainEvent): GenerationClientInputEvent[] {
  switch (event.type) {
    case 'generation.started':
      return [
        durableEvent(event, {
          type: 'generation.started',
          context: event.payload.context,
        }),
      ];
    case 'generation.accepted':
      return [];
    case 'generation.phase_changed':
      return [
        durableEvent(event, {
          type: 'generation.phase_changed',
          phase: event.payload.phase,
        }),
      ];
    case 'generation.cancel_requested':
      return [
        durableEvent(event, {
          type: 'generation.cancel_requested',
          requestedAt: event.payload.requestedAt,
          requestedBy: event.payload.requestedBy,
        }),
      ];
    case 'generation.checkpointed': {
      const assistantMessage = toMessageSnapshot(event.payload.checkpoint.assistantMessage);
      if (!assistantMessage) return [];
      return [
        durableEvent(event, {
          type: 'generation.checkpointed',
          checkpoint: {
            turnId: event.payload.checkpoint.turnId,
            iteration: event.payload.checkpoint.iteration,
            assistantMessage,
            pendingToolCallIds: event.payload.checkpoint.pendingToolCallIds,
          },
        }),
      ];
    }
    case 'generation.retry_scheduled':
      return [
        durableEvent(event, {
          type: 'generation.retry_scheduled',
          attempt: event.payload.attempt,
          maxAttempts: event.payload.maxAttempts,
          metadata: {
            turnId: event.payload.turnId,
            iteration: event.payload.iteration,
            operation: event.payload.operation,
            attempt: event.payload.attempt,
            maxAttempts: event.payload.maxAttempts,
            retryAt: event.payload.retryAt,
            errorCategory: event.payload.errorCategory,
          },
        }),
      ];
    case 'tool.requested':
      return [
        durableEvent(event, { type: 'tool.requested', call: toToolCall(event.payload.call) }),
      ];
    case 'tool.completed':
      return [durableEvent(event, { type: 'tool.completed', result: event.payload.result })];
    case 'tool.failed':
      return [durableEvent(event, { type: 'tool.failed', result: event.payload.result })];
    case 'confirmation.required':
      return [
        durableEvent(event, {
          type: 'confirmation.required',
          call: toToolCall({
            id: event.payload.toolCallId,
            name: event.payload.toolName,
            arguments: JSON.stringify(event.payload.args),
            iteration: event.payload.iteration,
            turnId: event.payload.turnId,
            messageId: event.payload.messageId,
            preview: event.payload.preview,
          }),
        }),
      ];
    case 'confirmation.approved':
      return [durableEvent(event, { type: 'confirmation.approved', callId: event.payload.callId })];
    case 'confirmation.rejected':
      return [
        durableEvent(event, {
          type: 'confirmation.rejected',
          callId: event.payload.callId,
          reason: event.payload.reason,
        }),
      ];
    case 'generation.committed': {
      const message = toMessageSnapshot(event.payload.message);
      if (!message) return [];
      return [
        durableEvent(event, {
          type: 'generation.committed',
          message,
          metadata: toTerminalMetadata(event.payload.metadata),
        }),
      ];
    }
    case 'generation.cancelled':
      return [
        durableEvent(event, {
          type: 'generation.cancelled',
          metadata: toTerminalMetadata(event.payload.metadata),
        }),
      ];
    case 'generation.failed':
      return [
        durableEvent(event, {
          type: 'generation.failed',
          message: event.payload.message,
          metadata: toTerminalMetadata(event.payload.metadata),
        }),
      ];
  }
}

export function toGenerationClientEvents(
  event: GenerationStreamEvent,
): GenerationClientInputEvent[] {
  if ('event' in event) {
    if (event.event.type === 'error') {
      const errorEvent: GenerationClientErrorEvent = {
        version: 1,
        generationId: event.generationId,
        event: { type: 'error', message: event.event.message },
      };
      return [errorEvent];
    }
    const liveEvent: ChatGenerationLiveEvent = {
      version: 1,
      generationId: event.generationId,
      event: event.event,
    };
    return [liveEvent];
  }
  return mapDurableEvent(event);
}
