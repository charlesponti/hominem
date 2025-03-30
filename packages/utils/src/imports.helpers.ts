import type { ProcessTransactionOptions } from './finance'
import logger from './logger'
import { redis } from './redis'
import type { ImportTransactionsJob } from './types'

export const IMPORT_JOB_PREFIX = 'import:job:'
export const IMPORT_JOBS_LIST = 'import:active-jobs'
export const IMPORT_PROGRESS_CHANNEL = 'import:progress'
export const JOB_EXPIRATION_TIME = 60 * 60 // 1 hour expiration time for jobs

/**
 * Get job status from Redis
 */
export async function getJobStatus(jobId: string): Promise<ImportTransactionsJob | null> {
  const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
  try {
    const job = await redis.get(jobKey)
    return job ? (JSON.parse(job) as ImportTransactionsJob) : null
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, error)
    return null
  }
}

/**
 * Get all active import jobs
 */
export async function getActiveJobs(): Promise<ImportTransactionsJob[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST)
    if (!jobIds.length) return []

    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await getJobStatus(jobId)
        return job
      })
    )

    // Filter out null jobs and remove completed jobs from active list
    const validJobs = jobs.filter((job): job is ImportTransactionsJob => !!job)

    // Clean up completed or errored jobs older than 10 minutes
    const now = Date.now()
    const jobsToRemove = validJobs.filter((job) => {
      const isDone = job.status === 'done' || job.status === 'error'
      const isOld = job.endTime && now - job.endTime > 10 * 60 * 1000 // 10 minutes
      return isDone && isOld
    })

    if (jobsToRemove.length > 0) {
      const jobIdsToRemove = jobsToRemove.map((job) => job.jobId)
      await redis.srem(IMPORT_JOBS_LIST, ...jobIdsToRemove)
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
  options: ProcessTransactionOptions
): Promise<ImportTransactionsJob> {
  const jobId = crypto.randomUUID()
  const { csvContent, fileName, ...otherOptions } = options
  try {
    // Create initial job record
    const job: ImportTransactionsJob = {
      jobId,
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

    // Save job to Redis
    await redis.set(`${IMPORT_JOB_PREFIX}${jobId}`, JSON.stringify(job), 'EX', 60 * 60)

    // Save csvContent to Redis
    const csvKey = `${IMPORT_JOB_PREFIX}${jobId}:csv`
    await redis.set(csvKey, options.csvContent, 'EX', JOB_EXPIRATION_TIME)

    // Add to active jobs list
    // The import function will listen for new jobs in the queue.
    await redis.sadd(IMPORT_JOBS_LIST, jobId)

    return job
  } catch (error) {
    logger.error(`Failed to queue import job ${jobId}:`, error)
    throw error
  }
}
