import { logger } from '@hominem/telemetry';
import { z } from 'zod';

const TerminalOutcomeSchema = z.enum(['committed', 'cancelled', 'failed']);

export type GenerationEventDelivery = 'live' | 'replayed';

export type GenerationDiagnosticRecord = {
  generationId: string;
  attempt?: number;
  turnId?: string;
  durableSequence?: number;
  replayCursor?: number;
  deliveryMode?: GenerationEventDelivery;
  recoveryDecision?: 'terminal' | 'awaiting_confirmation' | 'resume_required';
  terminalOutcome?: z.infer<typeof TerminalOutcomeSchema>;
  errorCategory?: 'provider' | 'tool' | 'transport' | 'persistence' | 'unknown';
  effectOutcome?: 'reused' | 'executed' | 'failed';
};

function toTerminalOutcome(phase: string) {
  const parsed = TerminalOutcomeSchema.safeParse(phase);
  return parsed.success ? parsed.data : undefined;
}

export function recordGenerationDiagnostic(input: GenerationDiagnosticRecord): void {
  logger.info('chat_generation_diagnostic', {
    generationId: input.generationId,
    ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
    ...(input.turnId === undefined ? {} : { turnId: input.turnId }),
    ...(input.durableSequence === undefined ? {} : { durableSequence: input.durableSequence }),
    ...(input.replayCursor === undefined ? {} : { replayCursor: input.replayCursor }),
    ...(input.deliveryMode === undefined ? {} : { deliveryMode: input.deliveryMode }),
    ...(input.recoveryDecision === undefined ? {} : { recoveryDecision: input.recoveryDecision }),
    ...(input.terminalOutcome === undefined ? {} : { terminalOutcome: input.terminalOutcome }),
    ...(input.errorCategory === undefined ? {} : { errorCategory: input.errorCategory }),
    ...(input.effectOutcome === undefined ? {} : { effectOutcome: input.effectOutcome }),
  });
}

export function recordGenerationEventDelivery(input: {
  generationId: string;
  sequence: number;
  delivery: GenerationEventDelivery;
}): void {
  recordGenerationDiagnostic({
    generationId: input.generationId,
    durableSequence: input.sequence,
    replayCursor: input.sequence,
    deliveryMode: input.delivery,
  });
  logger.info('chat_generation_event_delivered', input);
}

export function recordGenerationEventDeduplicated(input: {
  generationId: string;
  sequence: number;
}): void {
  recordGenerationDiagnostic({
    generationId: input.generationId,
    durableSequence: input.sequence,
    replayCursor: input.sequence,
    deliveryMode: 'replayed',
  });
  logger.info('chat_generation_event_deduplicated', input);
}

export function recordGenerationToolEffect(input: {
  generationId: string;
  toolName: string;
  outcome: 'reused' | 'executed' | 'failed';
}): void {
  recordGenerationDiagnostic({
    generationId: input.generationId,
    effectOutcome: input.outcome,
    errorCategory: input.outcome === 'failed' ? 'tool' : undefined,
  });
  logger.info('chat_generation_tool_effect', input);
}

export function recordGenerationRecovery(input: {
  generationId: string;
  phase: string;
  disposition: 'terminal' | 'awaiting_confirmation' | 'resume_required';
  lastDurableSequence: number;
}): void {
  recordGenerationDiagnostic({
    generationId: input.generationId,
    durableSequence: input.lastDurableSequence,
    replayCursor: input.lastDurableSequence,
    recoveryDecision: input.disposition,
    ...(input.disposition === 'terminal'
      ? { terminalOutcome: toTerminalOutcome(input.phase) }
      : {}),
  });
  logger.info('chat_generation_recovery', input);
}
