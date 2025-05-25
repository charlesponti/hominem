import './env.ts'

/**
 * Transaction import worker using BullMQ
 */
import { QUEUE_NAMES, REDIS_CHANNELS } from '@hominem/utils/consts'
import { processTransactionsFromCSV } from '@hominem/utils/finance'
import type {
  ImportTransactionsJob,
  ImportTransactionsQueuePayload,
  JobStats,
} from '@hominem/utils/jobs'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { type Job, Worker } from 'bullmq'
import { JOB_PROCESSING } from './config'
import { HealthService } from './health.service'
import { removeJobFromQueue } from './import-job.utils'
import { JobStatusService } from './job-status.service'

// Configuration
const CONCURRENCY = 3

interface JobProcessingOutput {
  stats?: Partial<JobStats>
  success?: boolean
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
      // Ensure removeOnComplete and removeOnFail are not set to 0, or jobs might get stuck
      // removeOnComplete: { count: 1000 }, // Default is true (keep 1000)
      // removeOnFail: { count: 5000 },    // Default is true (keep 5000)
    })

    this.setupEventHandlers()
    this.setupSignalHandlers()

    // Initialize health service
    this.healthService = new HealthService(this.worker, 'Transaction Import Worker')
  }

  /**
   * Decode and validate the CSV content
   */
  private static async decodeAndValidateContent(
    jobId: string,
    csvContentBase64: string
  ): Promise<string> {
    try {
      const decodedContent = Buffer.from(csvContentBase64, 'base64').toString('utf-8')

      if (!decodedContent || decodedContent.trim().length === 0) {
        throw new Error('Decoded CSV content is empty')
      }

      if (!decodedContent.includes(',') || !decodedContent.includes('\n')) {
        logger.warn(`Job ${jobId}: Decoded content doesn't appear to be a valid CSV format`)
      }

      logger.info(
        `Job ${jobId}: Successfully decoded CSV content (length: ${decodedContent.length})`
      )

      return decodedContent
    } catch (decodeError) {
      await removeJobFromQueue(jobId)
      throw new Error(
        `Failed to decode CSV content: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
      )
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
    const { jobId, fileName, userId, accountId, options } = jobData
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

    for await (const result of processTransactionsFromCSV({
      fileName,
      csvContent: decodedContent,
      userId,
      accountId: accountId,
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

      const currentProgress = Math.min(99, Math.round((processedCount / totalLinesToProcess) * 100))

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

      const jobDataForProcessor: ImportTransactionsJob = {
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        csvContent: job.data.csvContent,
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

      if (!jobDataForProcessor.csvContent) {
        throw new Error(`CSV content not found in job ${job.id}`)
      }

      await JobStatusService.markJobProcessing(job.id as string)
      logger.info(`Job ${job.id}: Marked as processing by JobStatusService`)

      const decodedContent = await TransactionImportWorker.decodeAndValidateContent(
        job.id as string,
        jobDataForProcessor.csvContent
      )

      const updateBullJobProgress = async (progress: number) => {
        await job.updateProgress(progress)
        logger.debug(`Updated BullMQ job ${job.id} progress to ${progress}%`)
      }

      await TransactionImportWorker.processCSVContent(
        jobDataForProcessor,
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
      logger.error(`Error processing job ${job.id}:`, error)

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
          logger.error(`Job ${job.id}: Error publishing completion to Redis:`, publishError)
        }
      }
    )

    this.worker.on(
      'failed',
      (job: Job<ImportTransactionsQueuePayload> | undefined, error: Error) => {
        logger.error(`Job ${job?.id} failed:`, error)

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
            .catch((err) => {
              logger.error(`Error publishing failure for job ${job.id}:`, err)
            })
        }
      }
    )

    this.worker.on('error', (error: Error) => {
      logger.error('Worker error:', error)
    })

    this.worker.on(
      'progress',
      (job: Job<ImportTransactionsQueuePayload>, progress: number | object) => {
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
            logger.error(`Error publishing progress for job ${job.id}:`, err)
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
      logger.error('Error during transaction import worker shutdown:', error)
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

    process.on('uncaughtException', async (error) => {
      logger.error('Transaction import worker uncaught exception:', error)
      await this.handleGracefulShutdown()
    })

    process.on('unhandledRejection', async (reason) => {
      logger.error('Transaction import worker unhandled promise rejection:', reason)
      await this.handleGracefulShutdown()
    })
  }
}

// Bootstrap the worker
const worker = new TransactionImportWorker()
