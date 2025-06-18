import './env.ts'

/**
 * Transaction import worker using BullMQ
 */
import { QUEUE_NAMES, REDIS_CHANNELS } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import { processTransactionsFromCSV } from '@hominem/utils/finance'
import { IMPORT_JOB_PREFIX } from '@hominem/utils/imports'
import type {
  ImportTransactionsJob,
  ImportTransactionsQueuePayload,
  JobStats,
} from '@hominem/utils/jobs'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { csvStorageService } from '@hominem/utils/supabase'
import { type Job, Worker } from 'bullmq'
import { sql } from 'drizzle-orm'
import { JOB_PROCESSING } from './config'
import { HealthService } from './health.service'
import { JobStatusService } from './job-status.service'

// Configuration
const CONCURRENCY = 3

interface JobProcessingOutput {
  stats?: Partial<JobStats>
  success?: boolean
}

/**
 * Remove a job from the import queue
 * Note: CSV files are now stored in Supabase storage, not Redis
 */
export async function removeJobFromQueue(jobId: string): Promise<void> {
  try {
    const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`

    logger.info(`Removing job ${jobId} from Redis`)

    await redis.del(jobKey)
    logger.info(`Successfully removed job ${jobId}`)
  } catch (error) {
    logger.error({ error, jobId }, `Failed to remove job ${jobId}`)
  }
}

/**
 * Worker class for processing transaction imports
 */
export class TransactionImportWorker {
  private worker: Worker
  private isShuttingDown = false
  private healthService: HealthService

  /**
   * Initialize the worker
   */
  constructor() {
    // Create worker to process import jobs
    this.worker = new Worker(QUEUE_NAMES.IMPORT_TRANSACTIONS, this.processJob, {
      connection: redis,
      concurrency: CONCURRENCY,
      // Auto-cleanup completed and failed jobs to prevent Redis memory bloat
      removeOnComplete: { count: 2 },
      removeOnFail: { count: 5 },
    })

    this.setupEventHandlers()
    this.setupSignalHandlers()

    // Initialize health service
    this.healthService = new HealthService(this.worker, 'Transaction Import Worker')
  }

  /**
   * Download and validate the CSV content from Supabase storage
   */
  private static async downloadAndValidateContent(
    jobId: string,
    filePath: string
  ): Promise<string> {
    try {
      const csvContent = await csvStorageService.downloadCsvFile(filePath)

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('Downloaded CSV content is empty')
      }

      if (!csvContent.includes(',') || !csvContent.includes('\n')) {
        logger.warn(`Job ${jobId}: Downloaded content doesn't appear to be a valid CSV format`)
      }

      logger.info(
        `Job ${jobId}: Successfully downloaded CSV content (length: ${csvContent.length})`
      )

      return csvContent
    } catch (downloadError) {
      await removeJobFromQueue(jobId)
      throw new Error(
        `Failed to download CSV content: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`
      )
    }
  }

  /**
   * Get internal user ID from Supabase ID
   */
  static async getUserIdFromSupabaseId(supabaseId: string): Promise<string | null> {
    try {
      const result = await db.execute(
        sql`SELECT id FROM users WHERE supabase_id = ${supabaseId} LIMIT 1`
      )
      return result.length > 0 ? (result[0] as any).id : null
    } catch (error) {
      logger.error('Error getting user ID from Supabase ID:', {
        supabaseId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Validate that a user exists in the database by Supabase ID
   */
  static async validateUserExists(supabaseId: string): Promise<boolean> {
    try {
      const result = await db.execute(
        sql`SELECT id FROM users WHERE supabase_id = ${supabaseId} LIMIT 1`
      )
      return result.length > 0
    } catch (error) {
      logger.error('Error validating user exists:', {
        supabaseId,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  /**
   * Process the CSV content
   */
  private static async processCSVContent(
    jobData: ImportTransactionsJob,
    decodedContent: string,
    stats: JobStats,
    startTime: number,
    updateBullJobProgress: (progress: number) => Promise<void>
  ): Promise<void> {
    const { jobId, fileName, userId, options } = jobData
    let processedCount = 0
    const totalLinesToProcess = Math.max(
      1,
      decodedContent.split('\n').length - (decodedContent.includes('\n') ? 1 : 0)
    )
    let lastReportedProgress = -1

    const countableActionKeys: ReadonlyArray<
      keyof Pick<JobStats, 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'>
    > = ['created', 'updated', 'skipped', 'merged', 'invalid']

    const isCountableActionKey = (key: string): key is (typeof countableActionKeys)[number] => {
      return countableActionKeys.includes(key as (typeof countableActionKeys)[number])
    }

    stats.total = 0

    try {
      for await (const result of processTransactionsFromCSV({
        fileName,
        csvContent: decodedContent,
        userId,
        deduplicateThreshold: options?.deduplicateThreshold,
        batchSize: options?.batchSize,
        batchDelay: options?.batchDelay,
        maxRetries: JOB_PROCESSING.MAX_RETRIES,
        retryDelay: JOB_PROCESSING.RETRY_DELAY,
      })) {
        processedCount++
        stats.total = (stats.total || 0) + 1

        if (result.action) {
          if (isCountableActionKey(result.action)) {
            stats[result.action] = (stats[result.action] ?? 0) + 1
          } else {
            logger.warn(
              `Job ${jobId}: Received unexpected action key '${result.action}' from processor`
            )
          }
        }

        const currentProgress = Math.min(
          99,
          Math.round((processedCount / totalLinesToProcess) * 100)
        )

        if (jobData.stats) {
          jobData.stats.progress = currentProgress
        }
        stats.progress = currentProgress

        if (currentProgress !== lastReportedProgress) {
          await updateBullJobProgress(currentProgress)
          lastReportedProgress = currentProgress
        }
      }
      logger.info(
        `Job ${jobId} CSV processing: ${processedCount} items processed. Stats: ${JSON.stringify(stats)}`
      )
    } catch (processingError) {
      // Enhanced error logging for CSV processing
      logger.error(
        {
          error: {
            name: processingError instanceof Error ? processingError.name : 'Unknown',
            message:
              processingError instanceof Error ? processingError.message : String(processingError),
            stack: processingError instanceof Error ? processingError.stack : undefined,
          },
          jobId,
          processedCount,
          totalLinesToProcess,
          fileName,
          csvContentLength: decodedContent.length,
          csvPreview: `${decodedContent.substring(0, 200)}...`,
        },
        `Error during CSV processing iteration for job ${jobId}`
      )

      // Add error to stats
      const errorMessage =
        processingError instanceof Error ? processingError.message : String(processingError)
      if (stats.errors) {
        stats.errors.push(`CSV Processing Error: ${errorMessage}`)
      } else {
        stats.errors = [`CSV Processing Error: ${errorMessage}`]
      }

      // Re-throw to let the main error handler deal with it
      throw processingError
    }
  }

  /**
   * Process a transaction import job
   */
  private processJob = async (
    job: Job<ImportTransactionsQueuePayload>
  ): Promise<JobProcessingOutput | undefined> => {
    if (!job.id) {
      logger.error('Job ID is undefined, cannot process BullMQ job', {
        jobName: job.name,
        queueName: job.queueName,
      })
      throw new Error('Job ID is undefined, cannot process BullMQ job.')
    }

    logger.info(`Processing job ${job.id} (${job.data.fileName}) for user ${job.data.userId}`)

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
      await job.updateProgress(0)

      if (!job.data.csvFilePath) {
        throw new Error(`CSV file path not found in job ${job.id}`)
      }

      await JobStatusService.markJobProcessing(job.id as string)
      logger.info(`Job ${job.id}: Marked as processing by JobStatusService`)

      // Convert Supabase ID to internal user ID
      logger.info(`Job ${job.id}: Converting Supabase ID to internal user ID`, {
        supabaseId: job.data.userId,
      })

      const internalUserId = await TransactionImportWorker.getUserIdFromSupabaseId(job.data.userId)
      if (!internalUserId) {
        const errorMessage = `User with Supabase ID ${job.data.userId} does not exist in the database`
        logger.error(`Job ${job.id}: ${errorMessage}`)
        stats.errors = [errorMessage]
        stats.processingTime = Date.now() - startTime

        await JobStatusService.markJobError(job.id as string, errorMessage, stats)
        throw new Error(errorMessage)
      }

      logger.info(`Job ${job.id}: Found internal user ID`, {
        supabaseId: job.data.userId,
        internalUserId,
      })

      // Update job data to use internal user ID for processing
      const jobDataWithInternalUserId = {
        ...job.data,
        userId: internalUserId,
      }

      // Debug Supabase configuration
      logger.info(`Job ${job.id}: Attempting to download CSV from Supabase`, {
        csvFilePath: job.data.csvFilePath,
        supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
      })

      const decodedContent = await TransactionImportWorker.downloadAndValidateContent(
        job.id as string,
        job.data.csvFilePath
      )

      const jobDataForProcessor: ImportTransactionsJob = {
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        csvContent: decodedContent,
        type: 'import-transactions',
        status: 'processing',
        options: {
          deduplicateThreshold: job.data.deduplicateThreshold,
          batchSize: job.data.batchSize,
          batchDelay: job.data.batchDelay,
        },
        stats: { progress: 0 },
        startTime: job.timestamp,
      }

      const updateBullJobProgress = async (progress: number) => {
        await job.updateProgress(progress)
        logger.debug(`Updated BullMQ job ${job.id} progress to ${progress}%`)
      }

      await TransactionImportWorker.processCSVContent(
        jobDataWithInternalUserId,
        decodedContent,
        stats,
        startTime,
        updateBullJobProgress
      )

      stats.progress = 100
      stats.processingTime = Date.now() - startTime

      await job.updateProgress(100)

      logger.info(`BullMQ job ${job.id} completed successfully`, {
        stats,
        processingTime: stats.processingTime,
      })

      return {
        success: true,
        stats,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Enhanced error logging
      logger.error(
        {
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
        },
        `Error processing job ${job.id}`
      )

      // Also log the full error to console for debugging
      console.error(`Full error details for job ${job.id}:`, error)

      if (stats.errors) {
        stats.errors.push(errorMessage)
      } else {
        stats.errors = [errorMessage]
      }
      stats.processingTime = Date.now() - startTime

      logger.info(`Job ${job.id}: Attempting to mark job error with JobStatusService...`)
      await JobStatusService.markJobError(job.id as string, errorMessage, stats)
      logger.info(`Job ${job.id}: Marked as error by JobStatusService`)

      throw error
    }
  }

  /**
   * Set up event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('active', (job: Job<ImportTransactionsQueuePayload>) => {
      logger.info(`Job ${job.id} (${job.data.fileName}) started processing`)
    })

    this.worker.on(
      'completed',
      async (job: Job<ImportTransactionsQueuePayload>, result: JobProcessingOutput | undefined) => {
        if (this.isShuttingDown) {
          logger.warn(`Job ${job.id}: Worker shutting down, skipping completion handling`)
          return
        }

        logger.info(`Job ${job.id} completed successfully`)

        const finalStats =
          result?.stats || (job.returnvalue as JobProcessingOutput | undefined)?.stats || {}

        try {
          // Mark job as done in our custom job status system
          if (job.id) {
            await JobStatusService.markJobDone(job.id as string, {
              progress: 100,
              processingTime: job.processedOn
                ? Date.now() - job.processedOn
                : result?.stats?.processingTime || 0,
              ...finalStats,
            })
          }

          // Publish completion status
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
            ])
          )
        } catch (publishError) {
          logger.error(
            { error: publishError, jobId: job.id },
            `Job ${job.id}: Error in completion handler`
          )
          // Don't rethrow the error to prevent uncaught exceptions
        }
      }
    )

    this.worker.on(
      'failed',
      (job: Job<ImportTransactionsQueuePayload> | undefined, error: Error) => {
        if (this.isShuttingDown) {
          logger.warn(`Job ${job?.id}: Worker shutting down, skipping failure handling`)
          return
        }

        logger.error({ error, jobId: job?.id }, `Job ${job?.id} failed`)

        if (job) {
          redis
            .publish(
              REDIS_CHANNELS.IMPORT_PROGRESS,
              JSON.stringify([
                {
                  jobId: job.id,
                  status: 'error',
                  error: error instanceof Error ? error.message : String(error),
                  fileName: job.data.fileName,
                  userId: job.data.userId,
                },
              ])
            )
            .catch((publishError) => {
              logger.error(
                { error: publishError, jobId: job.id },
                `Error publishing failure for job ${job.id}`
              )
              // Don't rethrow to prevent uncaught exceptions
            })
        }
      }
    )

    this.worker.on('error', (error: Error) => {
      logger.error({ error }, 'Worker error')
    })

    this.worker.on(
      'progress',
      (job: Job<ImportTransactionsQueuePayload>, progress: number | object) => {
        if (this.isShuttingDown) {
          return // Skip progress reporting during shutdown
        }

        logger.debug(
          `Job ${job.id} progress: ${typeof progress === 'number' ? `${progress}%` : JSON.stringify(progress)}`
        )

        const progressPercentage = typeof progress === 'number' ? progress : job.progress

        redis
          .publish(
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
            ])
          )
          .catch((err) => {
            logger.error(
              { error: err, jobId: job.id },
              `Error publishing progress for job ${job.id}`
            )
            // Don't rethrow to prevent uncaught exceptions
          })
      }
    )
  }

  /**
   * Handle graceful shutdown
   */
  private async handleGracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return

    this.isShuttingDown = true
    logger.info('Starting graceful shutdown of transaction import worker...')

    try {
      await this.worker.close()
      logger.info('Transaction import worker closed successfully')
    } catch (error) {
      logger.error({ error }, 'Error during transaction import worker shutdown')
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      logger.info('Transaction import worker received SIGTERM, cleaning up...')
      await this.handleGracefulShutdown()
    })

    process.on('SIGINT', async () => {
      logger.info('Transaction import worker received SIGINT, cleaning up...')
      await this.handleGracefulShutdown()
    })

    // Note: Removed uncaughtException and unhandledRejection handlers
    // These are now handled by the main process in index.ts to avoid conflicts
  }
}

// Bootstrap the worker
const worker = new TransactionImportWorker()
