import logger from './logger'
import { redis } from './redis'
import type { BaseJob, ImportTransactionsJob, ProcessTransactionOptions } from './types'

export const IMPORT_JOBS_LIST_KEY = 'import:active-jobs'
export const IMPORT_JOB_PREFIX = 'import:job:'
export const JOB_EXPIRATION_TIME = 60 * 60 // 1 hour expiration time for jobs

/**
 * Get job status from Redis
 */
export async function getJobStatus<T>(jobId: string): Promise<T | null> {
  try {
    const job = await redis.get(`${IMPORT_JOB_PREFIX}${jobId}`)
    return job ? (JSON.parse(job) as T) : null
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, error)
    return null
  }
}

/**
 * Remove job from Redis
 * @param jobId - The ID of the job to remove
 */
export async function removeJobFromQueue(jobId: string) {
  // Remove file content from cache
  await redis.del(`${IMPORT_JOB_PREFIX}${jobId}:csv`)
  // Remove job from Redis
  await redis.del(`${IMPORT_JOB_PREFIX}${jobId}`)
  // Remove job from active jobs list
  await redis.srem(IMPORT_JOBS_LIST_KEY, [jobId])
}

/**
 * Get Base64 encoded file content for a given job ID
 */
export async function getImportFileContent(jobId: string): Promise<string | null> {
  return redis.get(`${IMPORT_JOB_PREFIX}${jobId}:csv`)
}

/**
 * Get all active import jobs
 */
export async function getActiveJobs<T extends BaseJob>(): Promise<T[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST_KEY)
    if (!jobIds.length) return []

    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await getJobStatus(jobId)
        return job
      })
    )

    // Filter out null jobs and remove completed jobs from active list
    const validJobs = jobs.filter((job): job is T => !!job)

    // Clean up completed or errored jobs older than 10 minutes
    const now = Date.now()
    const jobsToRemove = validJobs.filter((job) => {
      const isDone = job.status === 'done' || job.status === 'error'
      const isOld = job.endTime && now - job.endTime > 10 * 60 * 1000 // 10 minutes
      return isDone && isOld
    })

    if (jobsToRemove.length > 0) {
      const jobIdsToRemove = jobsToRemove.map((job) => job.jobId)
      await redis.srem(IMPORT_JOBS_LIST_KEY, ...jobIdsToRemove)
    }

    return validJobs
  } catch (error) {
    logger.error('Failed to get active jobs:', error)
    return []
  }
}

/**
 * Queue an import job
 */
export async function queueImportJob(
  options: ProcessTransactionOptions & { userId: string }
): Promise<ImportTransactionsJob> {
  const jobId = crypto.randomUUID()
  const { csvContent, fileName, userId, ...otherOptions } = options
  try {
    // Create initial job record
    const job: ImportTransactionsJob = {
      jobId,
      userId,
      fileName,
      status: 'queued',
      startTime: Date.now(),
      options: otherOptions,
      stats: {
        progress: 0,
        processingTime: 0,
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
      },
    }

    // Save csvContent to Redis.
    // This must be done before saving the job to Redis to ensure the content is available for processing.
    const csvKey = `${IMPORT_JOB_PREFIX}${jobId}:csv`
    await redis.set(csvKey, options.csvContent, 'EX', JOB_EXPIRATION_TIME)

    // Save job to Redis
    await redis.set(`${IMPORT_JOB_PREFIX}${jobId}`, JSON.stringify(job), 'EX', JOB_EXPIRATION_TIME)

    // Add to active jobs list.
    // The import function will listen for new jobs in the queue.
    await redis.sadd(IMPORT_JOBS_LIST_KEY, jobId)

    return job
  } catch (error) {
    logger.error(`Failed to queue import job ${jobId}:`, error)
    throw error
  }
}
