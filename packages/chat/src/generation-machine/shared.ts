/**
 * Leaf utilities shared by every reducer module. Imports only from `types.ts`
 * so it can never be the source of a cross-module cycle.
 */

import type {
  GenerationActivePhase,
  GenerationCommand,
  GenerationEventPayload,
  GenerationToolCall,
} from './types';

export function generationEventIdempotencyKey(
  generationId: string,
  event: GenerationEventPayload,
): string {
  switch (event.type) {
    case 'generation.started':
    case 'generation.accepted':
      return `${generationId}:${event.type}`;
    case 'generation.phase_changed':
      return `${generationId}:${event.type}:${event.phase}`;
    case 'generation.cancel_requested':
    case 'generation.checkpointed':
    case 'generation.committed':
    case 'generation.cancelled':
    case 'generation.failed':
      return `${generationId}:${event.type}`;
    case 'tool.requested':
      return `${generationId}:${event.type}:${event.call.id}`;
    case 'tool.completed':
    case 'tool.failed':
      return `${generationId}:${event.type}:${event.result.callId}`;
    case 'confirmation.required':
      return `${generationId}:${event.type}:${event.call.id}`;
    case 'confirmation.approved':
    case 'confirmation.rejected':
      return `${generationId}:${event.type}:${event.callId}`;
    case 'generation.retry_scheduled':
      return `${generationId}:${event.type}:${event.attempt}`;
  }
}

export function persistCommand(
  generationId: string,
  event: GenerationEventPayload,
): GenerationCommand {
  return {
    type: 'persist',
    event,
    idempotencyKey: generationEventIdempotencyKey(generationId, event),
  };
}

export function phaseCommands(
  generationId: string,
  phase: GenerationActivePhase,
): GenerationCommand[] {
  return [
    persistCommand(generationId, { type: 'generation.phase_changed', phase }),
    { type: 'emit', event: { type: 'phase-changed', phase } },
  ];
}

export function toolCallIdempotencyKey(
  generationId: string,
  call: GenerationToolCall,
): string {
  return `${generationId}:${call.turnId}:${call.id}`;
}
