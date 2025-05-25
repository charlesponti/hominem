/**
 * Combined worker service that runs all workers in parallel
 * This is a centralized entry point for Railway deployment
 * The worker instances are created and started in their respective files
 */
import { logger } from '@hominem/utils/logger'
import './env.ts'

// Import all worker entry points
import './plaid-worker'
import './transaction-import-worker'

// Production-ready process management
let isShuttingDown = false

function gracefulShutdown() {
  if (isShuttingDown) return

  isShuttingDown = true
  logger.info('Initiating graceful shutdown for main process...')

  // Give workers a moment to complete their shutdown
  setTimeout(() => {
    logger.info('Main process shutdown complete.')
    process.exit(0)
  }, 1000) // Increased timeout for production
}

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received by main process')
  gracefulShutdown()
})

process.on('SIGINT', () => {
  logger.info('SIGINT received by main process')
  gracefulShutdown()
})

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in main process:', error)
  gracefulShutdown()
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection in main process:', reason)
  gracefulShutdown()
})
