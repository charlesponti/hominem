import { ChatSpeechRunRepository, db } from '@hominem/db';
import {
  QUEUE_NAMES,
  speechUsageReconciliationQueue,
  type SpeechUsageReconciliationJob,
} from '@hominem/queues';
import { redis as cache } from '@hominem/services/redis';
import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';
import { Worker } from 'bullmq';

import { reconcileSpeechUsage } from '../application/speech-usage.service';

let worker: Worker | null = null;
const reconciliationTracer = getTelemetryTracer('hominem.worker');

async function enqueuePendingSpeechUsageRuns() {
  const runs = await ChatSpeechRunRepository.listPending(db);
  await Promise.all(
    runs.map((run) =>
      speechUsageReconciliationQueue.add(
        'reconcile-speech-usage',
        { speechRunId: run.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 },
          jobId: run.id,
          removeOnComplete: true,
          removeOnFail: true,
        },
      ),
    ),
  );
}

export function startSpeechUsageReconciliationWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION,
    async (job) => {
      const span = reconciliationTracer.startSpan('speech.reconciliation', {
        attributes: { 'speech.job': QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION },
      });
      try {
        await reconcileSpeechUsage((job.data as SpeechUsageReconciliationJob).speechRunId);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(new Error('Speech usage reconciliation failed'));
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    },
    { connection: cache },
  );

  worker.on('failed', (job, error) => {
    logger.error('[speech-usage] reconciliation job failed', {
      jobId: job?.id,
      error,
    });
  });

  void enqueuePendingSpeechUsageRuns().catch((error) => {
    logger.error('[speech-usage] failed to enqueue pending runs', { error });
  });

  return worker;
}
