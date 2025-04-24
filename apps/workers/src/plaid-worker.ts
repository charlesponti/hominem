/**
 * Plaid sync worker
 */
import './env.ts'

import { db } from '@hominem/utils/db'
import { logger } from '@hominem/utils/logger'
import { plaidItems } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import { processSyncJob } from './plaid-sync.processor'

// Configuration
const POLLING_INTERVAL = 5 * 60 * 1000 // 5 minutes
const CONCURRENCY_LIMIT = 3

/**
 * Worker class for processing Plaid sync jobs
 */
export class PlaidSyncWorker {
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
      logger.info('Plaid sync worker already started')
      return
    }

    logger.info(`Starting Plaid sync polling with interval of ${POLLING_INTERVAL}ms`)
    this.pollingInterval = setInterval(() => this.processPlaidSyncs(), POLLING_INTERVAL)

    // Process syncs immediately on startup
    this.processPlaidSyncs().catch((err) => {
      logger.error('Error processing Plaid syncs on startup:', err)
    })
  }

  /**
   * Stop the worker
   */
  public stop(): void {
    if (!this.pollingInterval) {
      logger.info('Plaid sync worker already stopped')
      return
    }

    clearInterval(this.pollingInterval)
    this.pollingInterval = null
    logger.info('Plaid sync worker stopped')
  }

  /**
   * Process Plaid items that need syncing
   */
  private async processPlaidSyncs(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Still processing previous syncs, skipping poll')
      return
    }

    try {
      this.isProcessing = true

      // Find Plaid items that need syncing (last sync > 24 hours ago or null)
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)

      const itemsToSync = await db.query.plaidItems.findMany({
        where: and(
          eq(plaidItems.status, 'active')
          // Last synced more than 24 hours ago or never synced
          // OR sync error occurred more than 1 hour ago
        ),
        limit: CONCURRENCY_LIMIT,
      })

      logger.info(`Found ${itemsToSync.length} Plaid items to sync`)

      // Process each item
      for (const item of itemsToSync) {
        try {
          logger.info(`Processing Plaid sync for item ${item.itemId} (user ${item.userId})`)

          // Process the sync job
          await processSyncJob({
            id: `plaid-sync-${item.id}-${Date.now()}`,
            data: {
              userId: item.userId,
              accessToken: item.accessToken,
              itemId: item.itemId,
              initialSync: false,
            },
            name: 'plaid-sync',
            timestamp: Date.now(),
            opts: {},
            // Implement updateProgress as no-op
            updateProgress: async () => {},
          })

          logger.info(`Plaid sync for item ${item.itemId} completed successfully`)
        } catch (error) {
          logger.error(`Unexpected error processing Plaid sync for item ${item.itemId}:`, error)

          // Update item status to error
          await db
            .update(plaidItems)
            .set({
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
              updatedAt: new Date(),
            })
            .where(eq(plaidItems.id, item.id))
        }
      }
    } catch (error) {
      logger.error('Error in Plaid sync polling loop:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Handle graceful shutdown
   */
  private async handleGracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...')
    this.stop()
    this.isProcessing = true
    logger.info('Plaid sync worker shutdown completed')
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
logger.info('Starting Plaid sync worker...')
const worker = new PlaidSyncWorker()
worker.start()
