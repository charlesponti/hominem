import { ChatSpeechRunRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
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
  logger.info('queue_speech_usage_snapshot', {
    queue: QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION,
    pending: runs.length,
  });
}

export function startSpeechUsageReconciliationWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker<SpeechUsageReconciliationJob>(
    QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION,
    async (job) => {
      const span = reconciliationTracer.startSpan('speech.reconciliation', {
        attributes: { 'speech.job': QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION },
      });
      try {
        await reconcileSpeechUsage(job.data.speechRunId);
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

  worker.on('failed', (_job, error) => {
    logger.error('queue_speech_usage_job_failed', { error });
  });

  worker.on('completed', () => {
    logger.info('queue_speech_usage_job_completed', {
      queue: QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION,
    });
  });

  worker.on('stalled', () => {
    logger.warn('queue_speech_usage_job_stalled', {
      queue: QUEUE_NAMES.SPEECH_USAGE_RECONCILIATION,
    });
  });

  void enqueuePendingSpeechUsageRuns().catch((error) => {
    logger.error('[speech-usage] failed to enqueue pending runs', { error });
  });

  return worker;
}
