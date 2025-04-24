/**
 * !TODO Enable worker to set the batch progress to enable picking up where it left off
 * !TODO Use Redis subscription to listen for job updates
 */
// Load environment variables
import './env.ts'

// Use local utility files to avoid ESM resolution issues
import { processTransactionsFromCSV } from '@hominem/utils/finance'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import type { BaseJob } from '@hominem/utils/types'
import {
  getActiveJobs,
  getImportFileContent,
  IMPORT_JOB_PREFIX,
  JOB_EXPIRATION_TIME,
  removeJobFromQueue,
} from './import-job-utils.ts'
import type { ImportTransactionsJob, JobStats } from './utils.ts'

const IMPORT_PROGRESS_CHANNEL = 'import:progress'

// Configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const POLLING_INTERVAL = 30 * 1000 // 30 seconds
const CHUNK_SIZE = 1000 // Process 1000 transactions at a time

/**
 * Update job status in Redis with retry logic
 */
export async function updateJobStatus<T extends BaseJob>(
  jobId: string,
  update: Partial<T>,
  retries = MAX_RETRIES
) {
  try {
    const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
    const pipeline = redis.pipeline()

    // Get current state
    const currentJobString = await redis.get(jobKey)
    if (!currentJobString) {
      logger.warn(`Job ${jobId} not found in Redis. Skipping update.`)
      return undefined
    }
    const current = JSON.parse(currentJobString) as ImportTransactionsJob

    // Merge update into current state
    const updated = { ...current, ...update }

    // Special handling for stats: Only merge if both current and update are ImportTransactionsJob compatible
    // And both have stats properties involved.
    if (
      updated.type === 'import-transactions' &&
      'stats' in update &&
      update.stats &&
      'stats' in current &&
      current.stats
    ) {
      // Use type assertion now that we've confirmed the type and presence of stats
      const currentImportJob = current
      const updateImportJob = update as Partial<ImportTransactionsJob>
      const mergedStats = {
        ...(currentImportJob.stats || {}),
        ...(updateImportJob.stats || {}),
      }
      // Assign merged stats back to the updated object (which is known to be ImportTransactionsJob here)
      ;(updated as ImportTransactionsJob).stats = mergedStats
    }

    // Update job in Redis with TTL
    pipeline.set(jobKey, JSON.stringify(updated), 'EX', JOB_EXPIRATION_TIME)

    // Publish progress update if the job is ImportTransactionsJob and has progress
    if (
      updated.type === 'import-transactions' &&
      (updated as ImportTransactionsJob).stats?.progress !== undefined
    ) {
      pipeline.publish(IMPORT_PROGRESS_CHANNEL, JSON.stringify([updated]))
    }

    await pipeline.exec()
    return updated
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Retrying update for job ${jobId}, attempts remaining: ${retries}`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      return updateJobStatus<T>(jobId, update, retries - 1)
    }
    logger.error(`Failed to update job status for ${jobId} after ${MAX_RETRIES} retries:`, error)
    throw error
  }
}

/**
 * Process an import job in the background with retry logic
 */
export async function processImportJob(job: ImportTransactionsJob) {
  const { jobId, file: fileName, userId } = job

  // Check that userId exists
  if (!userId) {
    logger.error(`Job ${jobId} has no userId, cannot process`)
    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'error',
      endTime: Date.now(),
      error: 'Missing userId in job',
      type: 'import-transactions',
      stats: {
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        errors: ['Missing userId in job'],
        progress: 0,
        processingTime: 0,
      },
    })
    return
  }

  logger.info(`Starting import job ${jobId} for file ${fileName || 'unnamed'} for user ${userId}`)

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
  }

  const startTime = Date.now()

  try {
    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'processing',
      startTime,
      type: 'import-transactions',
      stats: { progress: 0 },
    })

    // Get base64 encoded CSV content from Redis
    const csvContentBase64 = await getImportFileContent(jobId)
    if (!csvContentBase64) {
      throw new Error(`CSV content not found for job ${jobId}`)
    }

    let decodedContent: string
    try {
      // Safely decode the base64 content to UTF-8
      decodedContent = Buffer.from(csvContentBase64, 'base64').toString('utf-8')

      // Basic validation of CSV content
      if (!decodedContent || decodedContent.trim().length === 0) {
        throw new Error('Decoded CSV content is empty')
      }

      // Check if content looks like a CSV (contains commas and at least one newline)
      if (!decodedContent.includes(',') || !decodedContent.includes('\n')) {
        logger.warn(`Job ${jobId}: Decoded content doesn't appear to be a valid CSV format`)
      }

      logger.info(
        `Job ${jobId}: Successfully decoded CSV content (length: ${decodedContent.length})`
      )
    } catch (decodeError) {
      await removeJobFromQueue(jobId)
      throw new Error(
        `Failed to decode CSV content: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
      )
    }

    let processedCount = 0
    const totalEstimate = decodedContent.split('\n').length - 1

    const countableActionKeys: ReadonlyArray<
      keyof Pick<JobStats, 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'>
    > = ['created', 'updated', 'skipped', 'merged', 'invalid']

    // Type guard using the specific keys array type
    const isCountableActionKey = (key: string): key is (typeof countableActionKeys)[number] => {
      return countableActionKeys.includes(key as (typeof countableActionKeys)[number])
    }

    // Process transactions in batches
    for await (const result of processTransactionsFromCSV({
      fileName,
      csvContent: decodedContent,
      userId,
      accountId: job.accountId,
      deduplicateThreshold: job.options?.deduplicateThreshold,
      batchSize: job.options?.batchSize,
      batchDelay: job.options?.batchDelay,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY,
    })) {
      processedCount++
      stats.total++

      if (result.action) {
        if (isCountableActionKey(result.action)) {
          // Now the type of result.action is narrowed correctly
          stats[result.action]++
        } else {
          logger.warn(
            `Job ${jobId}: Received unexpected action key '${result.action}' from processor`
          )
          stats.invalid++
        }
      }

      if (processedCount % 100 === 0 && totalEstimate > 0) {
        stats.progress = Math.min(99, Math.round((processedCount / totalEstimate) * 100))
        stats.processingTime = Date.now() - startTime
        await updateJobStatus<ImportTransactionsJob>(jobId, {
          stats: { progress: stats.progress, processingTime: stats.processingTime },
          type: 'import-transactions',
        })
      }
    }

    stats.progress = 100
    stats.processingTime = Date.now() - startTime

    logger.info(
      `Job ${jobId} completed: ${stats.total} transactions processed in ${stats.processingTime}ms`,
      {
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        merged: stats.merged,
        invalid: stats.invalid,
      }
    )

    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'done',
      endTime: Date.now(),
      stats: stats,
      type: 'import-transactions',
    })

    await removeJobFromQueue(jobId)
    logger.info(`Job ${jobId} removed from Redis`)

    global.gc?.()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Job ${jobId} failed:`, error)
    stats.errors.push(errorMessage)
    stats.processingTime = Date.now() - startTime

    try {
      await updateJobStatus<ImportTransactionsJob>(jobId, {
        status: 'error',
        endTime: Date.now(),
        error: errorMessage,
        type: 'import-transactions',
        stats: {
          ...stats,
          progress: stats.progress,
        },
      })
    } catch (updateError) {
      logger.error(`Failed to update error status for job ${jobId}:`, updateError)
    }
  }
}

let isProcessing = false
setInterval(async () => {
  if (isProcessing) {
    logger.debug('Still processing previous jobs, skipping poll')
    return
  }

  try {
    isProcessing = true
    const activeJobs = await getActiveJobs()

    for (const job of activeJobs) {
      if (!job?.jobId || !job?.userId) {
        // Use optional chaining
        logger.error('Received invalid job data from getActiveJobs (should not happen): ', job)
        if (job?.jobId) {
          // Use optional chaining
          await removeJobFromQueue(job.jobId)
        }
        continue
      }

      try {
        logger.info(`Processing job ${job.jobId} (${job.file}) for user ${job.userId}`)
        await processImportJob(job)
        logger.info(`Job ${job.jobId} processed successfully`)
      } catch (error) {
        logger.error(`Unexpected error during processing call for job ${job.jobId}:`, error)
        try {
          await updateJobStatus<ImportTransactionsJob>(job.jobId, {
            status: 'error',
            error: `Worker failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`,
            endTime: Date.now(),
            type: 'import-transactions',
          })
        } catch (statusUpdateError) {
          logger.error(
            `Failed to update job ${job.jobId} status after unexpected error:`,
            statusUpdateError
          )
        }
      }
    }
  } catch (error) {
    logger.error('Error in job polling loop:', error)
  } finally {
    isProcessing = false
  }
}, POLLING_INTERVAL)

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up...')
  try {
    const activeJobs = await getActiveJobs()
    for (const job of activeJobs) {
      if (job.jobId && job.status === 'processing') {
        // Use optional chaining
        logger.info(`Resetting job ${job.jobId} status to 'queued' due to SIGTERM`)
        await updateJobStatus<ImportTransactionsJob>(job.jobId, {
          status: 'queued',
          startTime: undefined,
          type: 'import-transactions',
        })
      }
    }
  } catch (error) {
    logger.error('Error during SIGTERM cleanup:', error)
  }
  process.exit(0)
})
