import type { GenerationMessageSnapshot, GenerationStartContext } from './generation-events';
import type {
  ChatGenerationKind,
  ChatGenerationStatus,
  GenerationHistoryEventPayload,
} from './generation-machine';

export type GenerationRunIdentity = {
  generationId: string;
  chatId: string;
  ownerUserId: string;
  kind: ChatGenerationKind;
  userMessageId: string | null;
  targetAssistantMessageId: string | null;
};

export type GenerationRunProjection = GenerationRunIdentity & {
  status: ChatGenerationStatus;
  assistantMessageId: string | null;
  errorMessage: string | null;
};

export class GenerationProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationProjectionError';
  }
}

function assertStartContext(
  identity: GenerationRunIdentity,
  context: GenerationStartContext,
): void {
  if (
    context.chatId !== identity.chatId ||
    context.kind !== identity.kind ||
    context.userMessageId !== identity.userMessageId ||
    context.targetAssistantMessageId !== identity.targetAssistantMessageId
  ) {
    throw new GenerationProjectionError('generation.started does not match run identity');
  }
}

function messageId(message: GenerationMessageSnapshot): string {
  return message.id;
}

function applyEvent(
  projection: GenerationRunProjection | null,
  identity: GenerationRunIdentity,
  event: GenerationHistoryEventPayload,
): GenerationRunProjection {
  if (event.type === 'generation.started') {
    if (projection) throw new GenerationProjectionError('generation.started was duplicated');
    assertStartContext(identity, event.context);
    return { ...identity, status: 'running', assistantMessageId: null, errorMessage: null };
  }

  if (!projection) throw new GenerationProjectionError(`${event.type} preceded generation.started`);
  if (['committed', 'cancelled', 'failed'].includes(projection.status)) {
    throw new GenerationProjectionError(`${event.type} followed a terminal event`);
  }

  switch (event.type) {
    case 'generation.accepted':
      return projection;
    case 'generation.phase_changed':
      return { ...projection, status: event.phase };
    case 'generation.cancel_requested':
      return { ...projection, status: 'cancel_requested' };
    case 'generation.checkpointed':
      return {
        ...projection,
        status: 'awaiting_confirmation',
        assistantMessageId: event.checkpoint.assistantMessage.id,
      };
    case 'generation.retry_scheduled':
      return { ...projection, status: 'running' };
    case 'tool.requested':
    case 'tool.completed':
    case 'tool.failed':
    case 'confirmation.required':
    case 'confirmation.approved':
    case 'confirmation.rejected':
      return projection;
    case 'generation.committed':
      return {
        ...projection,
        status: 'committed',
        assistantMessageId: messageId(event.message),
        errorMessage: null,
      };
    case 'generation.cancelled':
      return { ...projection, status: 'cancelled', errorMessage: null };
    case 'generation.failed':
      return { ...projection, status: 'failed', errorMessage: event.message };
  }
}

export function reduceGenerationProjection(
  projection: GenerationRunProjection | null,
  identity: GenerationRunIdentity,
  event: GenerationHistoryEventPayload,
): GenerationRunProjection {
  return applyEvent(projection, identity, event);
}

export function rebuildGenerationProjection(
  identity: GenerationRunIdentity,
  events: readonly GenerationHistoryEventPayload[],
): GenerationRunProjection {
  return (
    events.reduce<GenerationRunProjection | null>(
      (projection, event) => applyEvent(projection, identity, event),
      null,
    ) ??
    (() => {
      throw new GenerationProjectionError('generation has no events');
    })()
  );
}
