import { logger } from '@hominem/telemetry';

export type GenerationEventDelivery = 'live' | 'replayed';

export function recordGenerationEventDelivery(input: {
  generationId: string;
  sequence: number;
  delivery: GenerationEventDelivery;
}): void {
  logger.info('chat_generation_event_delivered', input);
}

export function recordGenerationEventDeduplicated(input: {
  generationId: string;
  sequence: number;
}): void {
  logger.info('chat_generation_event_deduplicated', input);
}

export function recordGenerationToolEffect(input: {
  generationId: string;
  toolName: string;
  outcome: 'reused' | 'executed' | 'failed';
}): void {
  logger.info('chat_generation_tool_effect', input);
}

export function recordGenerationRecovery(input: {
  generationId: string;
  phase: string;
  disposition: 'terminal' | 'awaiting_confirmation' | 'resume_required';
  lastDurableSequence: number;
}): void {
  logger.info('chat_generation_recovery', input);
}
