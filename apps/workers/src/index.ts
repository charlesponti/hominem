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
// Legacy worker import is commented out as we're now using BullMQ
// import './import-transactions-worker'

logger.info('All workers initialized and running')

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received by main process')
})

process.on('SIGINT', () => {
  logger.info('SIGINT received by main process')
})

// Keep the process alive
setInterval(() => {
  // Heartbeat
}, 60000)
