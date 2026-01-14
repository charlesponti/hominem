import './env.ts'

import { QUEUE_NAMES } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/data/redis'
import { type Job, Worker } from 'bullmq'
import { HealthService } from './health.service'
import { processSyncJob } from './plaid-sync.processor'

// Configuration
const CONCURRENCY = 3

const processPlaidSyncJob = async (job: Job): Promise<ReturnType<typeof processSyncJob>> => {
  logger.info(`Processing Plaid sync job ${job.id} for user ${job.data.userId}`)

  try {
    return await processSyncJob(job)
  } catch (error) {
    logger.error(`Error processing Plaid sync job ${job.id}`, { error, jobId: job.id })
    throw error
  }
}

const plaidWorker = new Worker(QUEUE_NAMES.PLAID_SYNC, processPlaidSyncJob, {
  connection: redis,
  concurrency: CONCURRENCY,
  lockDuration: 1000 * 60 * 10, // 10 minutes: time a job can run before considered stalled
  stalledInterval: 1000 * 60 * 5, // Check for stalled jobs every 5 minutes
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
})

const plaidHealthService = new HealthService(plaidWorker, 'Plaid Sync Worker')

let isPlaidShuttingDown = false

plaidWorker.on('completed', (job) => {
  if (isPlaidShuttingDown) {
    logger.warn(`Plaid sync job ${job.id}: Worker shutting down, skipping completion handling`)
    return
  }
  logger.info(`Plaid sync job ${job.id} completed successfully`)
})

plaidWorker.on('failed', (job, error) => {
  if (isPlaidShuttingDown) {
    logger.warn(`Plaid sync job ${job?.id}: Worker shutting down, skipping failure handling`)
    return
  }
  logger.error(`Plaid sync job ${job?.id} failed`, { error, jobId: job?.id })
})

plaidWorker.on('error', (error) => {
  if (isPlaidShuttingDown) {
    logger.warn('Plaid sync worker: Ignoring error during shutdown')
    return
  }
  logger.error('Plaid sync worker error', { error })
})

plaidWorker.on('stalled', (jobId) => {
  if (isPlaidShuttingDown) {
    return
  }
  logger.warn(`Plaid sync job ${jobId} stalled`)
})

const handleShutdown = async () => {
  if (isPlaidShuttingDown) {
    return
  }

  isPlaidShuttingDown = true
  logger.info('Starting graceful shutdown of Plaid sync worker...')

  try {
    await plaidWorker.close()
    logger.info('Plaid sync worker closed successfully')
    logger.info(plaidHealthService.getHealthSummary())
  } catch (error) {
    logger.error('Error during Plaid sync worker shutdown', { error })
  }
}

process.on('SIGTERM', async () => {
  logger.info('Plaid sync worker received SIGTERM, cleaning up...')
  await handleShutdown()
})

process.on('SIGINT', async () => {
  logger.info('Plaid sync worker received SIGINT, cleaning up...')
  await handleShutdown()
})
