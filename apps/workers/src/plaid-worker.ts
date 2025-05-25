/**
 * Plaid sync worker using BullMQ
 */
import './env.ts'

import { QUEUE_NAMES } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import { type Job, Worker } from 'bullmq'
import { HealthService } from './health.service'
import { processSyncJob } from './plaid-sync.processor'

// Configuration
const CONCURRENCY = 3

/**
 * Worker class for processing Plaid sync jobs
 */
export class PlaidSyncWorker {
  private worker: Worker
  private isShuttingDown = false
  private healthService: HealthService

  /**
   * Initialize the worker
   */
  constructor() {
    // Create worker to process Plaid sync jobs
    // Use queue name from constants to ensure consistency
    this.worker = new Worker(QUEUE_NAMES.PLAID_SYNC, this.processJob, {
      connection: redis,
      concurrency: CONCURRENCY,
      lockDuration: 1000 * 60 * 10, // 10 minutes: time a job can run before considered stalled
      stalledInterval: 1000 * 60 * 5, // Check for stalled jobs every 5 minutes
    })

    this.setupEventHandlers()
    this.setupSignalHandlers()

    // Initialize health service
    this.healthService = new HealthService(this.worker, 'Plaid Sync Worker')
  }

  /**
   * Process a Plaid sync job
   */
  private processJob = async (job: Job): Promise<ReturnType<typeof processSyncJob>> => {
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

    this.worker.on('stalled', (jobId) => {
      logger.warn(`Plaid sync job ${jobId} stalled`)
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
const worker = new PlaidSyncWorker()
