import { logger } from '@hominem/telemetry';

import { redis } from './redis';
import type { BaseJob } from './types';

export const IMPORT_JOBS_LIST_KEY = 'import:active-jobs';
export const IMPORT_JOB_PREFIX = 'import:job:';
export const USER_JOBS_PREFIX = 'import:user:';
export const IMPORT_PREFLIGHT_PREFIX = 'import:preflight:';
export const IMPORT_PREFLIGHT_TTL = 7 * 24 * 60 * 60;
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

  if (!user) {
    const job = await getJobStatus<BaseJob>(jobId);
    user = job?.userId;
  }

  const pipeline = redis.pipeline();

  pipeline.del(`${IMPORT_JOB_PREFIX}${jobId}:csv`);

  pipeline.del(`${IMPORT_JOB_PREFIX}${jobId}`);

  pipeline.srem(IMPORT_JOBS_LIST_KEY, jobId);

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
export async function getUserJobs<T extends BaseJob<string>>(
  userId: string,
  page = 1,
  limit = 20,
): Promise<{ jobs: T[]; total: number; page: number; pages: number }> {
  try {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit - 1;

    const total = await redis.zcard(`${USER_JOBS_PREFIX}${userId}`);

    if (total === 0) {
      return { jobs: [], total: 0, page, pages: 0 };
    }

    const jobIds = await redis.zrevrange(`${USER_JOBS_PREFIX}${userId}`, startIndex, endIndex);

    if (!jobIds.length) {
      return { jobs: [], total, page, pages: Math.ceil(total / limit) };
    }

    const jobResults: Array<T | null> = await Promise.all(
      jobIds.map((jobId: string) => getJobStatus<T>(jobId)),
    );

    const validJobs = jobResults.filter((job): job is T => job !== null);

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

export async function setImportFileContent(jobId: string, content: string): Promise<void> {
  await redis.set(`${IMPORT_JOB_PREFIX}${jobId}:csv`, content, 'EX', JOB_EXPIRATION_TIME);
}

export async function setImportPlanContent(planId: string, content: string): Promise<void> {
  await redis.set(`${IMPORT_JOB_PREFIX}${planId}:plan`, content, 'EX', IMPORT_PREFLIGHT_TTL);
}

export async function getImportPlanContent(planId: string): Promise<string | null> {
  return redis.get(`${IMPORT_JOB_PREFIX}${planId}:plan`);
}

export async function createPreflight(
  preflight: import('./types').ImportPreflight,
  fileContent: string,
  planContent: string,
): Promise<void> {
  const key = `${IMPORT_PREFLIGHT_PREFIX}${preflight.preflightId}`;
  const ttl = Math.max(1, Math.floor((preflight.expiresAt - Date.now()) / 1000));
  const pipeline = redis.pipeline();
  pipeline.set(key, JSON.stringify(preflight), 'EX', ttl);
  pipeline.set(`${key}:csv`, fileContent, 'EX', ttl);
  pipeline.set(`${key}:plan`, planContent, 'EX', ttl);
  await pipeline.exec();
}

export async function getPreflight(
  preflightId: string,
  userId: string,
): Promise<import('./types').ImportPreflight | null> {
  const value = await redis.get(`${IMPORT_PREFLIGHT_PREFIX}${preflightId}`);
  if (!value) return null;
  const preflight = JSON.parse(value) as import('./types').ImportPreflight;
  return preflight.userId === userId ? preflight : null;
}

export async function getPreflightPlanContent(
  preflightId: string,
  userId: string,
): Promise<string | null> {
  const preflight = await getPreflight(preflightId, userId);
  if (!preflight) return null;
  return redis.get(`${IMPORT_PREFLIGHT_PREFIX}${preflightId}:plan`);
}

export async function deletePreflight(preflightId: string, userId: string): Promise<boolean> {
  const preflight = await getPreflight(preflightId, userId);
  if (!preflight) return false;
  await redis.del(
    `${IMPORT_PREFLIGHT_PREFIX}${preflightId}`,
    `${IMPORT_PREFLIGHT_PREFIX}${preflightId}:csv`,
    `${IMPORT_PREFLIGHT_PREFIX}${preflightId}:plan`,
  );
  return true;
}

export async function updateImportJob<T extends BaseJob<string>>(
  jobId: string,
  job: T,
): Promise<void> {
  await redis.set(`${IMPORT_JOB_PREFIX}${jobId}`, JSON.stringify(job), 'EX', JOB_EXPIRATION_TIME);
}

export async function createImportJob<T extends BaseJob<string>>(job: T): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.set(`${IMPORT_JOB_PREFIX}${job.jobId}`, JSON.stringify(job), 'EX', JOB_EXPIRATION_TIME);
  pipeline.zadd(`${USER_JOBS_PREFIX}${job.userId}`, Date.now(), job.jobId);
  pipeline.sadd(IMPORT_JOBS_LIST_KEY, job.jobId);
  await pipeline.exec();
}

export async function updatePreflightStatus(
  preflightId: string,
  userId: string,
  status: import('./types').PreflightStatus,
): Promise<boolean> {
  const preflight = await getPreflight(preflightId, userId);
  if (!preflight) return false;
  await redis.set(
    `${IMPORT_PREFLIGHT_PREFIX}${preflightId}`,
    JSON.stringify({ ...preflight, status }),
    'EX',
    Math.max(1, Math.floor((preflight.expiresAt - Date.now()) / 1000)),
  );
  return true;
}

export async function claimPreflight(preflightId: string, userId: string): Promise<boolean> {
  const preflight = await getPreflight(preflightId, userId);
  if (!preflight || preflight.status !== 'ready') return false;
  const claimed = await redis.set(
    `${IMPORT_PREFLIGHT_PREFIX}${preflightId}:claim`,
    userId,
    'EX',
    Math.max(1, Math.floor((preflight.expiresAt - Date.now()) / 1000)),
    'NX',
  );
  return claimed === 'OK';
}

export async function requestImportCancellation(jobId: string, userId: string): Promise<boolean> {
  const job = await getJobStatus<BaseJob>(jobId);
  if (!job || job.userId !== userId || ['done', 'error', 'cancelled'].includes(job.status)) {
    return false;
  }
  await redis.set(`${IMPORT_JOB_PREFIX}${jobId}:cancel`, '1', 'EX', JOB_EXPIRATION_TIME);
  return true;
}

export async function isImportCancellationRequested(jobId: string): Promise<boolean> {
  return (await redis.get(`${IMPORT_JOB_PREFIX}${jobId}:cancel`)) === '1';
}

export async function publishImportProgress<T>(data: T): Promise<void> {
  await redis.publish('import:progress', JSON.stringify({ type: 'import:progress', data }));
}

/**
 * Get all active import jobs
 */
export async function getActiveJobs<T extends BaseJob<string>>(): Promise<T[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST_KEY);
    if (!jobIds.length) {
      return [];
    }

    const jobs = await getJobsByIds<T>(jobIds);

    const now = Date.now();
    const jobsToRemove = jobs.filter((job) => {
      const isDone = job.status === 'done' || job.status === 'error' || job.status === 'cancelled';
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

export async function getJobsByIds<T extends BaseJob<string>>(jobIds: string[]): Promise<T[]> {
  try {
    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await getJobStatus<T>(jobId);
        return job;
      }),
    );
    return jobs.filter((job): job is Awaited<T> => !!job);
  } catch {
    return [];
  }
}

/**
 * Get all queued import jobs
 */
export async function getQueuedJobs<T extends BaseJob<string>>(): Promise<T[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST_KEY);
    if (!jobIds.length) {
      return [];
    }

    const jobs = await getJobsByIds<T>(jobIds);

    return jobs.filter((job) => job.status === 'queued');
  } catch (error) {
    logger.error('Failed to get queued jobs', { error });
    return [];
  }
}
