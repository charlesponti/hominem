import { getSpeechGenerationUsage } from '@hominem/ai';
import { AIUsageEventRepository, ChatSpeechRunRepository, db } from '@hominem/db';
import { logger } from '@hominem/telemetry';

const MAX_RECONCILIATION_ATTEMPTS = 3;

function getErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : 'Speech usage reconciliation failed').slice(
    0,
    256,
  );
}

export async function reconcileSpeechUsage(speechRunId: string): Promise<void> {
  const run = await ChatSpeechRunRepository.getById(db, speechRunId);
  if (!run || run.reconciliationStatus !== 'pending') {
    return;
  }

  if (!run.providerGenerationId) {
    await ChatSpeechRunRepository.markReconciliation(db, {
      id: run.id,
      status: 'failed',
      error: 'Provider generation ID was not returned',
    });
    return;
  }

  try {
    const usage = await getSpeechGenerationUsage({ generationId: run.providerGenerationId });
    const status = run.status === 'failed' ? 'failed' : 'succeeded';
    await AIUsageEventRepository.createIfAbsent(db, {
      id: run.usageEventId,
      userId: run.ownerUserId,
      provider: usage.provider,
      feature: 'chat_speech',
      operation: 'speech',
      model: usage.model,
      inputTokens: usage.promptTokens,
      outputTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      costUsd: usage.costUsd,
      cachedInputTokens: usage.cachedPromptTokens,
      reasoningTokens: usage.reasoningTokens,
      status,
      usageAvailable: true,
    });
    const updated = await AIUsageEventRepository.updateUsage(db, {
      eventId: run.usageEventId,
      usage,
      status,
    });

    if (!updated) {
      throw new Error('Speech usage event could not be updated');
    }

    await ChatSpeechRunRepository.markReconciliation(db, {
      id: run.id,
      status: 'succeeded',
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const attempts = run.reconciliationAttempts + 1;
    const terminal = attempts >= MAX_RECONCILIATION_ATTEMPTS;

    await ChatSpeechRunRepository.markReconciliation(db, {
      id: run.id,
      status: terminal ? 'failed' : 'pending',
      error: message,
    });

    logger.warn('[speech-usage] reconciliation failed', {
      speechRunId: run.id,
      attempts,
      terminal,
      error: message,
    });

    if (!terminal) {
      throw error;
    }
  }
}
