import type { ImportTransactionsJob, BaseJob } from '@hominem/jobs-services';

import { IMPORT_JOB_PREFIX } from '@hominem/jobs-services';
import { redis } from '@hominem/services/redis';
import { REDIS_CHANNELS } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';

import type { JobUpdateResult } from './types';

import { JOB_PROCESSING, REDIS } from './config';

/**
 * Service for managing job status in Redis
 */
export class JobStatusService {
  /**
   * Update a job's status in Redis with retry logic
   * Returns the updated job or undefined if job not found
   */
  static async updateStatus<T extends BaseJob>(
    jobId: string,
    update: Partial<T>,
    retries = JOB_PROCESSING.MAX_RETRIES,
  ): Promise<T | undefined> {
    try {
      const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`;
      const pipeline = redis.pipeline();

      // Get current state
      const currentJobString = await redis.get(jobKey);
      if (!currentJobString) {
        logger.warn(`Job ${jobId} not found in Redis. Skipping update.`);
        return undefined;
      }

      // Parse the current job state
      const current = JSON.parse(currentJobString);

      // Merge update into current state
      const updated = { ...current, ...update };

      // Special handling for stats: Only merge if both current and update are ImportTransactionsJob compatible
      // And both have stats properties involved.
      if (
        updated.type === 'import-transactions' &&
        'stats' in update &&
        update.stats &&
        'stats' in current &&
        current.stats
      ) {
        // Since we know this is a transaction job from the type check, it's safe to use these specific types
        const mergedStats = {
          ...current.stats,
          ...update.stats,
        };
        // Assign merged stats back to the updated object
        updated.stats = mergedStats;
      }

      // Update job in Redis with TTL
      pipeline.set(jobKey, JSON.stringify(updated), 'EX', REDIS.JOB_EXPIRATION_TIME);

      // Publish progress update if the job is ImportTransactionsJob and has progress
      if (updated.type === 'import-transactions' && updated.stats?.progress !== undefined) {
        pipeline.publish(REDIS_CHANNELS.IMPORT_PROGRESS, JSON.stringify([updated]));
      }

      await pipeline.exec();

      // Use type assertion with a check for the correct return type
      return updated as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (retries > 0) {
        logger.warn(`Retrying update for job ${jobId}, attempts remaining: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, JOB_PROCESSING.RETRY_DELAY));
        return JobStatusService.updateStatus<T>(jobId, update, retries - 1);
      }
      logger.error(
        `Failed to update job status for ${jobId} after ${JOB_PROCESSING.MAX_RETRIES} retries:`,
        err,
      );
      throw err;
    }
  }

  /**
   * Reset a job's status to queued
   */
  static async resetJob(jobId: string): Promise<JobUpdateResult> {
    try {
      // Use a specific type when calling updateStatus
      const result = await JobStatusService.updateStatus<ImportTransactionsJob>(jobId, {
        status: 'queued',
        type: 'import-transactions',
      });

      return {
        success: !!result,
        jobId,
        job: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to reset job ${jobId}:`, err);

      return {
        success: false,
        jobId,
        error: err,
      };
    }
  }

  /**
   * Mark a job as error
   */
  static async markJobError(
    jobId: string,
    errorMessage: string,
    stats?: Partial<ImportTransactionsJob['stats']>,
  ): Promise<JobUpdateResult> {
    try {
      const result = await JobStatusService.updateStatus<ImportTransactionsJob>(jobId, {
        status: 'error',
        endTime: Date.now(),
        error: errorMessage,
        type: 'import-transactions',
        stats: stats || {},
      });

      return {
        success: !!result,
        jobId,
        job: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to mark job ${jobId} as error:`, err);

      return {
        success: false,
        jobId,
        error: err,
      };
    }
  }

  /**
   * Mark a job as done
   */
  static async markJobDone(
    jobId: string,
    stats: ImportTransactionsJob['stats'],
  ): Promise<JobUpdateResult> {
    try {
      const result = await JobStatusService.updateStatus<ImportTransactionsJob>(jobId, {
        status: 'done',
        endTime: Date.now(),
        stats,
        type: 'import-transactions',
      });

      return {
        success: !!result,
        jobId,
        job: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to mark job ${jobId} as done:`, err);

      return {
        success: false,
        jobId,
        error: err,
      };
    }
  }

  /**
   * Mark a job as processing
   */
  static async markJobProcessing(jobId: string): Promise<JobUpdateResult> {
    try {
      const startTime = Date.now();
      const result = await JobStatusService.updateStatus<ImportTransactionsJob>(jobId, {
        status: 'processing',
        startTime,
        type: 'import-transactions',
        stats: { progress: 0 },
      });

      return {
        success: !!result,
        jobId,
        job: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to mark job ${jobId} as processing:`, err);

      return {
        success: false,
        jobId,
        error: err,
      };
    }
  }

  /**
   * Update job progress
   */
  static async updateJobProgress(
    jobId: string,
    progress: number,
    processingTime: number,
  ): Promise<JobUpdateResult> {
    try {
      const result = await JobStatusService.updateStatus<ImportTransactionsJob>(jobId, {
        stats: { progress, processingTime },
        type: 'import-transactions',
      });

      return {
        success: !!result,
        jobId,
        job: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to update job ${jobId} progress:`, err);

      return {
        success: false,
        jobId,
        error: err,
      };
    }
  }
}
