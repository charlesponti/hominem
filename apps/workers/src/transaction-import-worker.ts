/**
 * Transaction import worker using BullMQ
 */
import { QUEUE_NAMES, REDIS_CHANNELS } from '@hominem/utils/consts'
import type { ImportTransactionsJob } from '@hominem/utils/jobs'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { type Job, Worker } from 'bullmq'
import './env.ts'
import { ImportJobProcessor } from './import-job.processor'

// Configuration
const CONCURRENCY = 3

/**
 * Worker class for processing transaction imports
 */
export class TransactionImportWorker {
  private worker: Worker
  private isShuttingDown = false

  /**
   * Initialize the worker
   */
  constructor() {
    // Create worker to process import jobs
    this.worker = new Worker(QUEUE_NAMES.IMPORT_TRANSACTIONS, this.processJob, {
      connection: redis,
      concurrency: CONCURRENCY,
    })

    this.setupEventHandlers()
    this.setupSignalHandlers()

    logger.info('Transaction Importer: Initialized')
  }

  /**
   * Process a transaction import job
   */
  private processJob = async (job: Job<ImportTransactionsJob>): Promise<any> => {
    logger.info(`Processing job ${job.id} (${job.data.fileName}) for user ${job.data.userId}`)

    try {
      return await ImportJobProcessor.processBullMQJob(job)
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error)
      throw error
    }
  }

  /**
   * Set up event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`)

      // Publish completion to Redis for WebSocket updates
      redis
        .publish(
          REDIS_CHANNELS.IMPORT_PROGRESS,
          JSON.stringify([
            {
              jobId: job.id,
              status: 'done',
              stats: {
                progress: 100,
                processingTime: Date.now() - (job.processedOn || Date.now()),
                ...job.returnvalue?.stats,
              },
              fileName: job.data.fileName,
              userId: job.data.userId,
            },
          ])
        )
        .catch((err) => {
          logger.error(`Error publishing completion for job ${job.id}:`, err)
        })
    })

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed:`, error)

      if (job) {
        // Publish failure to Redis for WebSocket updates
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
    })

    this.worker.on('error', (error) => {
      logger.error('Worker error:', error)
    })

    this.worker.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`)

      // Publish progress to Redis for WebSocket updates
      redis
        .publish(
          REDIS_CHANNELS.IMPORT_PROGRESS,
          JSON.stringify([
            {
              jobId: job.id,
              status: 'processing',
              stats: {
                progress: progress,
                processingTime: Date.now() - (job.processedOn || Date.now()),
              },
              fileName: job.data.fileName,
              userId: job.data.userId,
            },
          ])
        )
        .catch((err) => {
          logger.error(`Error publishing progress for job ${job.id}:`, err)
        })
    })
  }

  /**
   * Handle graceful shutdown
   */
  private async handleGracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return

    this.isShuttingDown = true
    logger.info('Starting graceful shutdown of transaction import worker...')

    try {
      // Close the worker
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

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Transaction import worker uncaught exception:', error)
      await this.handleGracefulShutdown()
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Transaction import worker unhandled promise rejection:', reason)
      await this.handleGracefulShutdown()
    })
  }
}

// Bootstrap the worker
logger.info('Starting transaction import worker...')
const worker = new TransactionImportWorker()

// Add a health check timer to periodically check job status
let hasLogged = false
setInterval(async () => {
  try {
    // Check if Redis connection is alive
    await redis.ping()

    // Log when the worker becomes active
    if (!hasLogged) {
      logger.info('Transaction import worker: Active')
      hasLogged = true
    }
  } catch (error) {
    logger.error('Transaction import worker: Health check failed', error)
  }
}, 30000) // Check every 30 seconds
