import { applyCopilotImportBatch, type ImportPlan } from '@hominem/finance-services/import';
import {
  getJobStatus,
  getImportPlanContent,
  isImportCancellationRequested,
  publishImportProgress,
  QUEUE_NAMES,
  type ImportTransactionsJob,
  type ImportTransactionsQueuePayload,
  updateImportJob,
} from '@hominem/queues';
import { redis as cache } from '@hominem/services/redis';
import { logger } from '@hominem/telemetry';
import { Job, Worker } from 'bullmq';

const BATCH_SIZE = 500;

let worker: Worker<ImportTransactionsQueuePayload> | null = null;

async function updateStatus(
  jobId: string,
  status: ImportTransactionsJob['status'],
  updates: Partial<ImportTransactionsJob> = {},
): Promise<ImportTransactionsJob | null> {
  const current = await getJobStatus<ImportTransactionsJob>(jobId);
  if (!current) return null;
  const next = { ...current, ...updates, status };
  await updateImportJob(jobId, next);
  await publishImportProgress([next]);
  return next;
}

async function processImportJob(job: Job<ImportTransactionsQueuePayload>): Promise<void> {
  const jobId = String(job.id);
  const planContent = await getImportPlanContent(job.data.planId);
  if (!planContent) throw new Error('Frozen import plan was not found or expired');
  const plan = JSON.parse(planContent) as ImportPlan;
  const current = await updateStatus(jobId, 'processing');
  if (!current) throw new Error('Import job status was not found');

  const selectedTransactions = plan.transactions.filter((transaction) => transaction.selected);
  let created = 0;
  let skipped = plan.stats.skipped;

  for (let offset = 0; offset < selectedTransactions.length; offset += BATCH_SIZE) {
    if (await isImportCancellationRequested(jobId)) {
      const latest = await getJobStatus<ImportTransactionsJob>(jobId);
      await updateStatus(jobId, 'cancelled', {
        endTime: Date.now(),
        stats: { ...(latest?.stats ?? current.stats), total: plan.stats.total, created, skipped },
      });
      return;
    }

    const batch = selectedTransactions.slice(offset, offset + BATCH_SIZE);
    const result = await applyCopilotImportBatch({
      userId: job.data.userId,
      plan,
      transactions: batch,
    });
    created += result.created;
    skipped += result.skipped;
    const progress =
      selectedTransactions.length === 0
        ? 100
        : Math.round(((offset + batch.length) / selectedTransactions.length) * 100);
    await job.updateProgress(progress);
    await updateStatus(jobId, 'processing', {
      stats: {
        total: plan.stats.total,
        progress,
        created,
        skipped,
        invalid: plan.stats.invalid,
      },
    });
  }

  await updateStatus(jobId, 'done', {
    endTime: Date.now(),
    stats: {
      total: plan.stats.total,
      progress: 100,
      created,
      skipped,
      invalid: plan.stats.invalid,
    },
  });
}

export function startImportTransactionsWorker() {
  if (worker) return worker;

  worker = new Worker<ImportTransactionsQueuePayload>(
    QUEUE_NAMES.IMPORT_TRANSACTIONS,
    processImportJob,
    {
      connection: cache,
      concurrency: 3,
    },
  );

  worker.on('failed', async (job, error) => {
    if (!job) return;
    logger.error('[finance-import] job failed', { jobId: job.id, error });
    await updateStatus(String(job.id), 'error', {
      endTime: Date.now(),
      error: error instanceof Error ? error.message : 'Import failed',
    });
  });

  worker.on('stalled', async (jobId) => {
    logger.warn('[finance-import] job stalled', { jobId });
    await updateStatus(String(jobId), 'error', {
      endTime: Date.now(),
      error: 'Import worker stalled before completion',
    });
  });

  return worker;
}
