/**
 * Transaction import worker with improved maintainability
 */
import './env.ts'

import { logger } from '@hominem/utils/logger'
import { JOB_PROCESSING } from './config'
import { getActiveJobs } from './import-job-utils.ts'
import { ImportJobProcessor } from './import-job.processor'
import { JobStatusService } from './job-status.service'

/**
 * Worker class for processing transaction imports
 */
export class TransactionImportWorker {
  private isProcessing = false
  private pollingInterval: NodeJS.Timeout | null = null

  /**
   * Initialize the worker
   */
  constructor() {
    this.setupSignalHandlers()
  }

  /**
   * Start the worker
   */
  public start(): void {
    if (this.pollingInterval) {
      logger.info('Worker already started')
      return
    }

    logger.info(`Starting job polling with interval of ${JOB_PROCESSING.POLLING_INTERVAL}ms`)
    this.pollingInterval = setInterval(
      () => this.processAvailableJobs(),
      JOB_PROCESSING.POLLING_INTERVAL
    )

    // Process jobs immediately on startup
    this.processAvailableJobs().catch((err) => {
      logger.error('Error processing jobs on startup:', err)
    })
  }

  /**
   * Stop the worker
   */
  public stop(): void {
    if (!this.pollingInterval) {
      logger.info('Worker already stopped')
      return
    }

    clearInterval(this.pollingInterval)
    this.pollingInterval = null
    logger.info('Worker stopped')
  }

  /**
   * Process available jobs
   */
  private async processAvailableJobs(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Still processing previous jobs, skipping poll')
      return
    }

    try {
      this.isProcessing = true
      const activeJobs = await getActiveJobs()
      logger.info(`Found ${activeJobs.length} jobs to process`)

      for (const job of activeJobs) {
        if (!job?.jobId || !job?.userId) {
          logger.error('Received invalid job data:', job)
          continue
        }

        try {
          logger.info(`Processing job ${job.jobId} (${job.fileName}) for user ${job.userId}`)
          await ImportJobProcessor.processJob(job)
          logger.info(`Job ${job.jobId} processed successfully`)
        } catch (error) {
          logger.error(`Unexpected error processing job ${job.jobId}:`, error)
          const errorMsg = error instanceof Error ? error.message : String(error)
          await JobStatusService.markJobError(job.jobId, `Worker failed: ${errorMsg}`)
        }
      }
    } catch (error) {
      logger.error('Error in job polling loop:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Handle graceful shutdown
   */
  private async handleGracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...')

    try {
      // Stop polling to prevent new jobs from being picked up
      this.stop()

      // Mark worker as processing to prevent concurrent operations
      this.isProcessing = true

      const activeJobs = await getActiveJobs()
      logger.info(`Found ${activeJobs.length} active jobs during shutdown`)

      // Process all active jobs and reset their status if needed
      const processingJobs = activeJobs.filter((job) => job?.jobId && job?.status === 'processing')

      if (processingJobs.length === 0) {
        logger.info('No processing jobs found during shutdown')
        return
      }

      logger.info(`Resetting ${processingJobs.length} processing jobs to queued status`)

      const results = await Promise.allSettled(
        processingJobs.map((job) => JobStatusService.resetJob(job.jobId))
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value.success).length

      const failed = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length

      logger.info(`Graceful shutdown completed: ${succeeded} jobs reset, ${failed} failed`)
    } catch (error) {
      logger.error('Error during graceful shutdown:', error)
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, cleaning up...')
      await this.handleGracefulShutdown()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, cleaning up...')
      await this.handleGracefulShutdown()
      process.exit(0)
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', error)
      await this.handleGracefulShutdown()
      process.exit(1)
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      logger.error('Unhandled promise rejection:', reason)
      await this.handleGracefulShutdown()
      process.exit(1)
    })
  }
}

// Bootstrap the worker
const worker = new TransactionImportWorker()
worker.start()
