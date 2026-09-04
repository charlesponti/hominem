import { AUDIO_TTS_MODEL, getSpeechUsageEstimate } from '@hominem/ai';
import { AIUsageEventRepository, ChatSpeechRunRepository, db } from '@hominem/db';
import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';

const MAX_RECONCILIATION_ATTEMPTS = 3;
const reconciliationTracer = getTelemetryTracer('hominem.speech-usage');

export function getSpeechUsageHealth() {
  return ChatSpeechRunRepository.getUsageHealth(db);
}

function getErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : 'Speech usage reconciliation failed').slice(
    0,
    256,
  );
}

export async function reconcileSpeechUsage(speechRunId: string): Promise<void> {
  return reconciliationTracer.startActiveSpan('speech.reconciliation.pricing', async (span) => {
    const run = await ChatSpeechRunRepository.getById(db, speechRunId);
    if (!run || run.reconciliationStatus !== 'pending') {
      span.setAttribute('speech.reconciliation.skipped', true);
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return;
    }

    span.setAttributes({
      'speech.reconciliation.attempt': run.reconciliationAttempts + 1,
      'speech.reconciliation.has_generation_id': Boolean(run.providerGenerationId),
    });
    logger.info('speech_usage_reconciliation_started', { speechRunId });

    if (!run.providerGenerationId) {
      await ChatSpeechRunRepository.markReconciliation(db, {
        id: run.id,
        status: 'failed',
        error: 'Provider generation ID was not returned',
      });
      logger.warn('speech_usage_reconciliation_missing_generation_id', { terminal: true });
      span.setAttribute('speech.reconciliation.outcome', 'missing_generation_id');
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      return;
    }

    try {
      if (run.status === 'failed') {
        await ChatSpeechRunRepository.markReconciliation(db, {
          id: run.id,
          status: 'succeeded',
          error: null,
        });
        span.setAttribute('speech.reconciliation.outcome', 'failed_speech_no_charge');
        span.setStatus({ code: SpanStatusCode.OK });
        return;
      }

      const usageEvent = await AIUsageEventRepository.getById(db, run.usageEventId);
      const usage = await getSpeechUsageEstimate({
        model: usageEvent?.model ?? AUDIO_TTS_MODEL,
        characterCount: run.characterCount,
      });
      const status = 'succeeded' as const;
      const usageEventCreated = await AIUsageEventRepository.createIfAbsent(db, {
        id: run.usageEventId,
        userId: run.ownerUserId,
        provider: usage.provider,
        feature: 'chat_speech',
        operation: 'speech',
        model: usage.model,
        promptTokens: usage.promptTokens,
        outputTokens: usage.outputTokens,
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
      logger.info('speech_usage_reconciliation_succeeded', {
        usageEventCreated,
        totalTokens: usage.totalTokens,
        costUsd: usage.costUsd,
        costSource: usage.costSource,
        usageAvailable: true,
      });
      span.setAttributes({
        'speech.reconciliation.outcome': 'succeeded',
        'speech.total_tokens': usage.totalTokens,
        'speech.cost_usd': usage.costUsd ?? 0,
        'speech.cost_source': usage.costSource,
        'speech.usage_available': true,
      });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      const message = getErrorMessage(error);
      const attempts = run.reconciliationAttempts + 1;
      const terminal = attempts >= MAX_RECONCILIATION_ATTEMPTS;

      await ChatSpeechRunRepository.markReconciliation(db, {
        id: run.id,
        status: terminal ? 'failed' : 'pending',
        error: message,
      });

      logger.warn('speech_usage_reconciliation_failed', { attempts, terminal });
      span.setAttributes({
        'speech.reconciliation.attempt': attempts,
        'speech.reconciliation.outcome': terminal ? 'failed_terminal' : 'retrying',
      });
      span.recordException(new Error('Speech usage reconciliation failed'));
      span.setStatus({ code: SpanStatusCode.ERROR });

      if (!terminal) {
        throw error;
      }
    } finally {
      span.end();
    }
  });
}
