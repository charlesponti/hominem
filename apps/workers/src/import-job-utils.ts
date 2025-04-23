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
    const jobKeys = await redis.keys(`${IMPORT_JOB_PREFIX}*`)
    if (!jobKeys.length) {
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

    const activeJobs = jobs.filter(
      (job): job is ImportTransactionsJob => job !== null && job.status === 'queued'
    ) // Only return queued jobs

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
    logger.info(`Removing job ${jobId} (${jobKey}) from queue`)
    await redis.del(jobKey)
  } catch (error) {
    logger.error(`Failed to remove job ${jobId}`, error)
  }
}

/**
 * Get the content of an import file (simulated)
 * In a real scenario, this might fetch from storage like S3 or a local cache.
 */
export async function getImportFileContent(jobId: string): Promise<string> {
  try {
    // Simulate fetching content based on jobId - replace with actual logic
    logger.info(`Simulating fetching import file content for job: ${jobId}`)
    // Example: return await fs.readFile(`/path/to/imports/${jobId}.csv`, 'utf-8')
    // For now, return mock CSV data
    const mockCsv = `"Account","Date","Amount","Description","Category"
"Checking","2025-04-20","-50.00","Coffee Shop","Food & Drink"
"Savings","2025-04-19","1000.00","Paycheck","Income"
`
    // Return as base64 encoded string as expected by the worker
    return Buffer.from(mockCsv).toString('base64')
  } catch (error) {
    logger.error(`Failed to get import file content for job ${jobId}`, error)
    throw new Error(`Failed to get import file content: ${error}`)
  }
}
