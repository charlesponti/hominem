import { redis } from '@hominem/services/redis';
import { logger } from '@hominem/utils/logger';

import type { BaseJob } from './types';

export const IMPORT_JOBS_LIST_KEY = 'import:active-jobs';
export const IMPORT_JOB_PREFIX = 'import:job:';
export const USER_JOBS_PREFIX = 'import:user:';
export const JOB_EXPIRATION_TIME = 60 * 60; // 1 hour expiration time for jobs

/**
 * Get job status from Redis
 */
export async function getJobStatus<T>(jobId: string): Promise<T | null> {
  try {
    const job = await redis.get(`${IMPORT_JOB_PREFIX}${jobId}`);
    return job ? (JSON.parse(job) as T) : null;
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, { error });
    return null;
  }
}

/**
 * Remove job from Redis
 * @param jobId - The ID of the job to remove
 * @param userId - Optional user ID to also remove from user's job list
 */
export async function removeJobFromQueue(jobId: string, userId?: string) {
  let user: string | undefined = userId;

  // Get the job to find the userId if not provided
  if (!user) {
    const job = await getJobStatus<BaseJob>(jobId);
    user = job?.userId;
  }

  const pipeline = redis.pipeline();

  // Remove file content from cache
  pipeline.del(`${IMPORT_JOB_PREFIX}${jobId}:csv`);

  // Remove job from Redis
  pipeline.del(`${IMPORT_JOB_PREFIX}${jobId}`);

  // Remove job from active jobs list
  pipeline.srem(IMPORT_JOBS_LIST_KEY, jobId);

  // Remove job from user's jobs list if userId is available
  if (user) {
    pipeline.zrem(`${USER_JOBS_PREFIX}${user}`, jobId);
  }

  await pipeline.exec();
}

/**
 * Get jobs by user ID with pagination
 * @param userId - The user ID to get jobs for
 * @param page - Page number (1-based)
 * @param limit - Number of jobs per page
 * @returns Array of job objects and pagination metadata
 */
export async function getUserJobs<T extends BaseJob>(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ jobs: T[]; total: number; page: number; pages: number }> {
  try {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    // Get total count of user's jobs
    const total = await redis.zcard(`${USER_JOBS_PREFIX}${userId}`);

    // No jobs found
    if (total === 0) {
      return { jobs: [], total: 0, page, pages: 0 };
    }

    // Get job IDs for the requested page (sorted by timestamp, newest first)
    const jobIds = await redis.zrevrange(`${USER_JOBS_PREFIX}${userId}`, startIndex, endIndex);

    if (!jobIds.length) {
      return { jobs: [], total, page, pages: Math.ceil(total / limit) };
    }

    // Get job details in parallel
    const jobResults = await Promise.all(jobIds.map((jobId) => getJobStatus<T>(jobId)));

    // Filter out null values with proper type assertion
    const validJobs: T[] = jobResults.filter((job): job is Awaited<T> => job !== null);

    return {
      jobs: validJobs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    logger.error(`Failed to get jobs for user ${userId}:`, { error });
    return { jobs: [], total: 0, page, pages: 0 };
  }
}

/**
 * Get Base64 encoded file content for a given job ID
 */
export async function getImportFileContent(jobId: string): Promise<string | null> {
  return redis.get(`${IMPORT_JOB_PREFIX}${jobId}:csv`);
}

/**
 * Get all active import jobs
 */
export async function getActiveJobs<T extends BaseJob>(): Promise<T[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST_KEY);
    if (!jobIds.length) {
      return [];
    }

    const jobs = await getJobsByIds<T>(jobIds);

    // Clean up completed or errored jobs older than 10 minutes
    const now = Date.now();
    const jobsToRemove = jobs.filter((job) => {
      const isDone = job.status === 'done' || job.status === 'error';
      const isOld = job.endTime && now - job.endTime > 10 * 60 * 1000; // 10 minutes
      return isDone && isOld;
    });

    if (jobsToRemove.length > 0) {
      const jobIdsToRemove = jobsToRemove.map((job) => job.jobId);
      await redis.srem(IMPORT_JOBS_LIST_KEY, ...jobIdsToRemove);
    }

    return jobs;
  } catch (error) {
    logger.error('Failed to get active jobs', { error });
    return [];
  }
}

export async function getJobsByIds<T extends BaseJob>(jobIds: string[]): Promise<T[]> {
  try {
    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await getJobStatus<T>(jobId);
        return job;
      }),
    );
    // Filter out null jobs
    return jobs.filter((job): job is Awaited<T> => !!job);
  } catch (_error) {
    return [];
  }
}

/**
 * Get all queued import jobs
 */
export async function getQueuedJobs<T extends BaseJob>(): Promise<T[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST_KEY);
    if (!jobIds.length) {
      return [];
    }

    const jobs = await getJobsByIds<T>(jobIds);

    // Filter out null jobs and only return queued jobs
    return jobs.filter((job) => job.status === 'queued');
  } catch (error) {
    logger.error('Failed to get queued jobs', { error });
    return [];
  }
}
