import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import type { ImportTransactionsJob } from './utils.ts'

export const IMPORT_JOB_PREFIX = 'import:job:'
export const JOB_EXPIRATION_TIME = 60 * 60 * 24 // 24 hours

/**
 * Get active import jobs from Redis
 */
export async function getActiveJobs(): Promise<ImportTransactionsJob[]> {
  try {
    // Get all keys that match the job prefix
    const allKeys = await redis.keys(`${IMPORT_JOB_PREFIX}*`)
    if (!allKeys.length) {
      return []
    }

    // Filter out CSV content keys to avoid parsing them as JSON
    const jobKeys = allKeys.filter((key) => !key.endsWith(':csv'))

    if (!jobKeys.length) {
      logger.info('No job objects found in Redis')
      return []
    }

    const jobsData = await redis.mget(jobKeys)
    const jobs = await Promise.all(
      jobsData.map(async (jobStr, index) => {
        try {
          return jobStr ? (JSON.parse(jobStr) as ImportTransactionsJob) : null
        } catch (e) {
          // Delete corrupted job data from Redis
          const jobKey = jobKeys[index]
          logger.error(`Failed to parse job data for ${jobKey}:`, e)

          try {
            await redis.del(jobKey)
            logger.info(`Deleted corrupted job data: ${jobKey}`)
          } catch (delError) {
            logger.error(`Failed to delete corrupted job ${jobKey}:`, delError)
          }

          return null
        }
      })
    )

    // Return both queued and processing jobs to properly handle SIGTERM graceful shutdown
    const activeJobs = jobs.filter(
      (job): job is ImportTransactionsJob =>
        job !== null && (job.status === 'queued' || job.status === 'processing')
    )

    logger.info(`Found ${activeJobs.length} active jobs`)
    return activeJobs
  } catch (error) {
    logger.error('Failed to get active jobs', error)
    return []
  }
}

/**
 * Remove a job from the import queue
 */
export async function removeJobFromQueue(jobId: string): Promise<void> {
  try {
    const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
    const csvKey = `${jobKey}:csv`

    logger.info(`Removing job ${jobId} and its associated data from Redis`)

    // Use pipeline to perform both deletions in a single Redis call
    const pipeline = redis.pipeline()
    pipeline.del(jobKey)
    pipeline.del(csvKey)

    await pipeline.exec()
    logger.info(`Successfully removed job ${jobId} and its CSV content`)
  } catch (error) {
    logger.error(`Failed to remove job ${jobId}`, error)
  }
}

/**
 * Get the content of an import file from Redis
 * Returns the base64-encoded CSV content that was saved from the API
 */
export async function getImportFileContent(jobId: string): Promise<string> {
  try {
    const csvKey = `${IMPORT_JOB_PREFIX}${jobId}:csv`
    logger.info(`Fetching import file content for job: ${jobId} from key: ${csvKey}`)

    const content = await redis.get(csvKey)
    if (!content) {
      throw new Error(`CSV content not found for job ${jobId}`)
    }

    // Validate that the content looks like base64 (simple regex check)
    const base64Regex = /^[A-Za-z0-9+/=]+$/
    if (!base64Regex.test(content.trim())) {
      logger.warn(`Content for job ${jobId} doesn't appear to be valid base64`)
    }

    return content
  } catch (error) {
    await removeJobFromQueue(jobId) // Clean up the job if there's an error
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to get import file content for job ${jobId}`, error)
    throw new Error(`Failed to get import file content: ${message}`)
  }
}
