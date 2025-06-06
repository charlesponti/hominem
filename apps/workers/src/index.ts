/**
 * Combined worker service that runs all worprocess.on('uncaughtException', (error: Error) => {
  logger.error({ error }, 'Uncaught exception in main process')
  gracefulShutdown(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ error: reason }, 'Unhandled promise rejection in main process')
  gracefulShutdown(1)
})arallel
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
const shutdownTimeout = 5000 // 5 seconds timeout for graceful shutdown

function gracefulShutdown(exitCode = 0) {
  if (isShuttingDown) return

  isShuttingDown = true
  logger.info('Initiating graceful shutdown for main process...')

  // Set a timeout for forced shutdown if graceful shutdown takes too long
  const forceShutdownTimer = setTimeout(() => {
    logger.warn('Graceful shutdown timeout reached, forcing exit...')
    process.exit(1)
  }, shutdownTimeout)

  // Give workers a moment to complete their shutdown
  setTimeout(() => {
    clearTimeout(forceShutdownTimer)
    logger.info('Main process shutdown complete.')
    process.exit(exitCode)
  }, 1500) // Increased timeout for workers to shut down
}

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received by main process')
  gracefulShutdown(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received by main process')
  gracefulShutdown(0)
})

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  logger.error(
    {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      },
    },
    'Uncaught exception in main process:'
  )
  console.error('Full uncaught exception details:', error)
  gracefulShutdown(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(
    {
      error: reason,
      promise: promise.toString(),
    },
    'Unhandled promise rejection in main process:'
  )
  console.error('Full unhandled rejection details:', reason)
  gracefulShutdown(1)
})
