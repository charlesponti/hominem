/**
 * Plaid sync worker using BullMQ
 */
import './env.ts'

import { QUEUE_NAMES } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { type Job, Worker } from 'bullmq'
import { processSyncJob } from './plaid-sync.processor'

// Configuration
const CONCURRENCY = 3

/**
 * Worker class for processing Plaid sync jobs
 */
export class PlaidSyncWorker {
  private worker: Worker
  private isShuttingDown = false

  /**
   * Initialize the worker
   */
  constructor() {
    // Create worker to process Plaid sync jobs
    // Use queue name from constants to ensure consistency
    this.worker = new Worker(QUEUE_NAMES.PLAID_SYNC, this.processJob, {
      connection: redis,
      concurrency: CONCURRENCY,
    })

    this.setupEventHandlers()
    this.setupSignalHandlers()

    logger.info(`Plaid Sync Worker initialized with queue name: ${QUEUE_NAMES.PLAID_SYNC}`)
  }

  /**
   * Process a Plaid sync job
   */
  private processJob = async (job: Job): Promise<any> => {
    logger.info(`Processing Plaid sync job ${job.id} for user ${job.data.userId}`)

    try {
      return await processSyncJob(job)
    } catch (error) {
      logger.error(`Error processing Plaid sync job ${job.id}:`, error)
      throw error
    }
  }

  /**
   * Set up event handlers for the worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info(`Plaid sync job ${job.id} completed successfully`)
    })

    this.worker.on('failed', (job, error) => {
      logger.error(`Plaid sync job ${job?.id} failed:`, error)
    })

    this.worker.on('error', (error) => {
      logger.error('Plaid sync worker error:', error)
    })
    
    this.worker.on('progress', (job, progress) => {
      logger.debug(`Plaid sync job ${job.id} progress: ${progress}%`)
    })
  }

  /**
   * Handle graceful shutdown
   */
  private async handleGracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) return
    
    this.isShuttingDown = true
    logger.info('Starting graceful shutdown of Plaid sync worker...')

    try {
      // Close the worker
      await this.worker.close()
      logger.info('Plaid sync worker closed successfully')
    } catch (error) {
      logger.error('Error during Plaid sync worker shutdown:', error)
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      logger.info('Plaid sync worker received SIGTERM, cleaning up...')
      await this.handleGracefulShutdown()
    })

    process.on('SIGINT', async () => {
      logger.info('Plaid sync worker received SIGINT, cleaning up...')
      await this.handleGracefulShutdown()
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Plaid sync worker uncaught exception:', error)
      await this.handleGracefulShutdown()
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Plaid sync worker unhandled promise rejection:', reason)
      await this.handleGracefulShutdown()
    })
  }
}

// Bootstrap the worker
logger.info('Starting Plaid sync worker...')
const worker = new PlaidSyncWorker()

// Add a health check timer to periodically check job status
setInterval(async () => {
  try {
    // Check if Redis connection is alive
    await redis.ping()
    logger.info('Plaid sync worker: Active')
  } catch (error) {
    logger.error('Plaid sync worker: Health check failed', error)
  }
}, 30000) // Check every 30 seconds
