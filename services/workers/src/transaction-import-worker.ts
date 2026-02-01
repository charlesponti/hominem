import './env.ts';
import type {
  ImportTransactionsJob,
  ImportTransactionsQueuePayload,
  JobStats,
} from '@hominem/jobs-services';

import { processTransactionsFromCSVBuffer } from '@hominem/finance-services';
import { redis } from '@hominem/services/redis';
import { QUEUE_NAMES, REDIS_CHANNELS } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';
import { csvStorageService } from '@hominem/utils/supabase';
import { type Job, Worker } from 'bullmq';
import { Effect } from 'effect';

import { HealthService } from './health.service';

const CONCURRENCY = process.env.WORKER_CONCURRENCY
  ? Number.parseInt(process.env.WORKER_CONCURRENCY, 10)
  : 3;

const processImportTransactionsJob = async (
  job: Job<ImportTransactionsQueuePayload>,
): Promise<{ success: boolean; stats: JobStats }> => {
  if (!job.id) {
    throw new Error('Job ID is undefined, cannot process BullMQ job.');
  }

  logger.info(`Processing job ${job.id} (${job.data.fileName}) for user ${job.data.userId}`);

  const stats: JobStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    merged: 0,
    total: 0,
    invalid: 0,
    errors: [],
    progress: 0,
    processingTime: 0,
  };
  const startTime = Date.now();

  await job.updateProgress(0);

  if (!job.data.csvFilePath) {
    throw new Error(`CSV file path not found in job ${job.id}`);
  }

  const fileBuffer = await csvStorageService.downloadCsvFileAsBuffer(
    job.data.csvFilePath as string,
  );
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Downloaded CSV file is empty');
  }

  const csvContent = fileBuffer.toString('utf-8');
  const totalLinesToProcess = Math.max(
    1,
    csvContent.split('\n').length - (csvContent.includes('\n') ? 1 : 0),
  );

  const jobData: ImportTransactionsJob = {
    jobId: job.id as string,
    userId: job.data.userId,
    fileName: job.data.fileName,
    csvContent,
    type: 'import-transactions',
    status: 'processing',
    options: {
      deduplicateThreshold: job.data.deduplicateThreshold,
      batchSize: job.data.batchSize,
      batchDelay: job.data.batchDelay,
    },
    stats: { progress: 0 },
    startTime: job.timestamp,
  };

  let processedCount = 0;
  let lastReportedProgress = -1;
  const progressUpdateInterval = 1000; // 1 second
  let lastProgressUpdateTime = Date.now();

  const countableActionKeys: ReadonlyArray<
    keyof Pick<JobStats, 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'>
  > = ['created', 'updated', 'skipped', 'merged', 'invalid'];

  const isCountableActionKey = (key: string): key is (typeof countableActionKeys)[number] =>
    countableActionKeys.includes(key as (typeof countableActionKeys)[number]);

  jobData.stats.total = 0;

  try {
    const results = (await Effect.runPromise(
      processTransactionsFromCSVBuffer({
        csvBuffer: fileBuffer,
        userId: job.data.userId,
      }),
    )) as Array<{ action?: string }>;

    for (const result of results) {
      processedCount++;
      jobData.stats.total = (jobData.stats.total || 0) + 1;

      if (result.action) {
        if (isCountableActionKey(result.action)) {
          const key = result.action as keyof Pick<
            JobStats,
            'created' | 'updated' | 'skipped' | 'merged' | 'invalid'
          >;
          jobData.stats[key] = (jobData.stats[key] ?? 0) + 1;
        } else {
          logger.warn(
            `Job ${job.id}: Received unexpected action key '${result.action}' from processor`,
          );
        }
      }

      const currentProgress = Math.min(
        99,
        Math.round((processedCount / totalLinesToProcess) * 100),
      );

      jobData.stats.progress = currentProgress;

      const now = Date.now();
      if (now - lastProgressUpdateTime > progressUpdateInterval) {
        if (currentProgress !== lastReportedProgress) {
          await job.updateProgress(currentProgress);
          lastReportedProgress = currentProgress;
        }
        lastProgressUpdateTime = now;
      }
    }

    stats.progress = 100;
    stats.processingTime = Date.now() - startTime;

    await job.updateProgress(100);

    logger.info(`[transaction-import] Job ${job.id} completed`);

    return {
      success: true,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error processing job ${job.id}`, {
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
      },
      jobId: job.id,
      jobData: {
        fileName: job.data.fileName,
        userId: job.data.userId,
        csvFilePath: job.data.csvFilePath,
      },
    });
    throw error;
  }
};

const worker = new Worker(QUEUE_NAMES.IMPORT_TRANSACTIONS, processImportTransactionsJob, {
  connection: redis,
  concurrency: CONCURRENCY,
});

const healthService = new HealthService(worker, 'Transaction Import Worker');

worker.on('active', (job: Job<ImportTransactionsQueuePayload>) => {
  logger.info(`Job ${job.id} (${job.data.fileName}) started processing`);
});

worker.on('completed', async (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
  const finalStats = result?.stats || {};
  await redis.publish(
    REDIS_CHANNELS.IMPORT_PROGRESS,
    JSON.stringify([
      {
        jobId: job.id,
        status: 'done',
        stats: {
          progress: 100,
          processingTime: job.processedOn
            ? Date.now() - job.processedOn
            : result?.stats?.processingTime || 0,
          ...finalStats,
        },
        fileName: job.data.fileName,
        userId: job.data.userId,
      },
    ]),
  );
});

worker.on('failed', (job, error) => {
  logger.error(
    `[transaction-import] Job ${job?.id} failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  if (job) {
    void redis.publish(
      REDIS_CHANNELS.IMPORT_PROGRESS,
      JSON.stringify([
        {
          jobId: job.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          fileName: job.data.fileName,
          userId: job.data.userId,
        },
      ]),
    );
  }
});

worker.on('error', (error: Error) => {
  logger.error('Worker error', { error });
});

worker.on('progress', (job, progress) => {
  logger.debug(
    `Job ${job.id} progress: ${
      typeof progress === 'number' ? `${progress}%` : JSON.stringify(progress)
    }`,
  );
  const progressPercentage = typeof progress === 'number' ? progress : job.progress;
  void redis.publish(
    REDIS_CHANNELS.IMPORT_PROGRESS,
    JSON.stringify([
      {
        jobId: job.id,
        status: 'processing',
        stats: {
          progress: progressPercentage,
          processingTime: Date.now() - (job.processedOn || job.timestamp),
        },
        fileName: job.data.fileName,
        userId: job.data.userId,
      },
    ]),
  );
});

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await worker.close();
    logger.info('Worker closed successfully');
    logger.info(healthService.getHealthSummary());
  } catch (error) {
    logger.error('Error during worker shutdown', { error });
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
