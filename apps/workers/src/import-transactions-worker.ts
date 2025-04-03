/**
 * !TODO Enable worker to set the batch progress to enable picking up where it left off
 * !TODO Use Redis subscription to listen for job updates
 */
import { parseTransactionString, processTransactionsFromCSV } from '@ponti/utils/finance'
import {
  getActiveJobs,
  getImportFileContent,
  IMPORT_JOB_PREFIX,
  JOB_EXPIRATION_TIME,
  removeJobFromQueue,
} from '@ponti/utils/imports'
import { logger } from '@ponti/utils/logger'
import { redis } from '@ponti/utils/redis'
import type { BaseJob, ImportTransactionsJob } from '@ponti/utils/types'
import { retryWithBackoff } from '@ponti/utils/utils'

const IMPORT_PROGRESS_CHANNEL = 'import:progress'

// Configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const POLLING_INTERVAL = 30 * 1000 // 30 seconds
const CHUNK_SIZE = 1000 // Process 1000 transactions at a time

/**
 * Update job status in Redis with retry logic
 */
export async function updateJobStatus<T>(
  jobId: string,
  update: Partial<T extends BaseJob ? T : BaseJob>,
  retries = MAX_RETRIES
) {
  try {
    const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
    const pipeline = redis.pipeline()

    // Get current state
    const current = JSON.parse((await redis.get(jobKey)) || '{}') as T
    const updated = { ...current, ...update }

    // Update job in Redis with TTL
    pipeline.set(jobKey, JSON.stringify(updated), 'EX', JOB_EXPIRATION_TIME)

    // Publish progress update if provided
    if (update.stats?.progress !== undefined) {
      pipeline.publish(IMPORT_PROGRESS_CHANNEL, JSON.stringify([updated]))
    }

    await pipeline.exec()
    return updated
  } catch (error) {
    if (retries > 0) {
      logger.warn(`Retrying update for job ${jobId}, attempts remaining: ${retries}`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
      return updateJobStatus(jobId, update, retries - 1)
    }
    logger.error(`Failed to update job status for ${jobId} after ${MAX_RETRIES} retries:`, error)
    throw error
  }
}

/**
 * Process an import job in the background with retry logic
 */
export async function processImportJob(job: ImportTransactionsJob) {
  const { jobId, fileName, userId } = job

  // Check that userId exists
  if (!userId) {
    logger.error(`Job ${jobId} has no userId, cannot process`)
    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'error',
      endTime: Date.now(),
      error: 'Missing userId in job',
      stats: {
        progress: 0,
        processingTime: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        errors: ['Missing userId in job'],
      },
    })
    return
  }

  logger.info(`Starting import job ${jobId} for file ${fileName} for user ${userId}`)

  try {
    // Update job to prevent other workers from processing it
    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'processing',
      stats: { progress: 0 },
      startTime: Date.now(),
    })

    // Get CSV content
    const csvContent = await getImportFileContent(jobId)
    if (!csvContent) {
      throw new Error(`CSV content not found for job ${jobId}`)
    }

    // Decode and parse CSV content with required userId
    const decodedContent = Buffer.from(csvContent, 'base64').toString('utf-8')
    const transactions = await retryWithBackoff(
      () => parseTransactionString(decodedContent, userId),
      {
        retries: MAX_RETRIES,
        delay: RETRY_DELAY,
      }
    )
    const totalTransactions = transactions.length
    logger.info(`Job ${jobId}: Parsed ${totalTransactions} transactions from CSV`)

    const startTime = Date.now()
    const stats: Required<ImportTransactionsJob['stats']> = {
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

    // Process transactions in chunks
    for await (const result of processTransactionsFromCSV({
      fileName,
      csvContent: decodedContent,
      deduplicateThreshold: job.options.deduplicateThreshold,
      batchSize: job.options.batchSize || 20,
      batchDelay: job.options.batchDelay || 200,
      maxRetries: MAX_RETRIES,
      retryDelay: RETRY_DELAY,
      userId,
    })) {
      if (result.action) stats[result.action]++
      stats.total++

      const progress = Math.min(100, Math.round((stats.total / totalTransactions) * 100))
      stats.progress = progress
      stats.processingTime = Date.now() - startTime

      // Update status less frequently to reduce Redis load
      if (stats.total % 100 === 0 || progress % 10 === 0) {
        await updateJobStatus(jobId, { stats })
      }

      // Free up memory periodically
      if (stats.total % CHUNK_SIZE === 0) {
        global.gc?.()
      }
    }

    const endTime = Date.now()
    const finalStats = {
      ...stats,
      progress: 100,
      processingTime: endTime - startTime,
    }

    logger.info(
      `Job ${jobId} completed: ${stats.total} transactions processed in ${finalStats.processingTime}ms`
    )

    await updateJobStatus<ImportTransactionsJob>(jobId, {
      status: 'done',
      endTime,
      stats: finalStats,
    })

    // Remove import job from Redis (pass userId for efficiency)
    await removeJobFromQueue(jobId, userId)
    logger.info(`Job ${jobId} removed from Redis`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Job ${jobId} failed:`, error)

    try {
      await updateJobStatus<ImportTransactionsJob>(jobId, {
        status: 'error',
        endTime: Date.now(),
        error: errorMessage,
        stats: {
          progress: 0,
          processingTime: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          merged: 0,
          total: 0,
          invalid: 0,
          errors: [errorMessage],
        },
      })
    } catch (updateError) {
      logger.error(`Failed to update error status for job ${jobId}:`, updateError)
    }
  }
}

// Poll for active jobs
let isProcessing = false
setInterval(async () => {
  logger.debug('Polling for active jobs...')
  if (isProcessing) {
    logger.debug('Still processing previous jobs, skipping poll')
    return
  }

  try {
    isProcessing = true
    const activeJobs = await getActiveJobs<ImportTransactionsJob>()

    // Process each active job
    for (const job of activeJobs) {
      if (!job.options) {
        logger.warn(`Job ${job.jobId} has no options, removing from queue`)
        await removeJobFromQueue(job.jobId, job.userId)
        continue
      }

      try {
        logger.info(`Processing job ${job.jobId} (${job.fileName})`)
        await processImportJob(job)
        logger.info(`Job ${job.jobId} processed successfully`)
      } catch (error) {
        logger.error(`Failed to process job ${job.jobId}:`, error)
      }
    }
  } catch (error) {
    logger.error('Error in job polling:', error)
  } finally {
    isProcessing = false
  }
}, POLLING_INTERVAL)

// Cleanup on process exit
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up...')
  try {
    const activeJobs = await getActiveJobs<ImportTransactionsJob>()
    for (const job of activeJobs) {
      await updateJobStatus<ImportTransactionsJob>(job.jobId, { status: 'queued' })
    }
  } catch (error) {
    logger.error('Error during cleanup:', error)
  }
  process.exit(0)
})
