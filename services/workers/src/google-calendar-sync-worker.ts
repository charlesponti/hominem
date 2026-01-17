/**
 * Google Calendar sync worker using BullMQ
 */
import './env.ts'

import { GoogleCalendarService } from '@hominem/services/google'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/services/redis'
import { type Job, Worker } from 'bullmq'
import { HealthService } from './health.service'

// Configuration
const CONCURRENCY = 2 // Lower concurrency for external API calls

export interface GoogleCalendarSyncPayload {
  userId: string
  accessToken: string
  refreshToken?: string
  calendarId?: string
  timeMin?: string
}

const processGoogleCalendarSyncJob = async (job: Job<GoogleCalendarSyncPayload>) => {
  logger.info(`Processing Google Calendar sync job ${job.id} for user ${job.data.userId}`)

  try {
    const { userId, accessToken, refreshToken, calendarId, timeMin } = job.data

    // Create Google Calendar service
    const googleService = new GoogleCalendarService(userId, {
      accessToken,
      refreshToken,
    })

    // Sync events
    const result = await googleService.syncGoogleCalendarEvents(calendarId, timeMin)

    logger.info(`Google Calendar sync completed for user ${userId}`, {
      created: result.created,
      updated: result.updated,
      deleted: result.deleted,
      errors: result.errors.length,
    })

    if (!result.success) {
      throw new Error(`Sync failed: ${result.errors.join(', ')}`)
    }

    return result
  } catch (error) {
    logger.error('Google Calendar sync job failed', { error, jobId: job.id })
    throw error
  }
}

const googleCalendarWorker = new Worker(
  QUEUE_NAMES.GOOGLE_CALENDAR_SYNC,
  processGoogleCalendarSyncJob,
  {
    connection: redis,
    concurrency: CONCURRENCY,
    lockDuration: 1000 * 60 * 5, // 5 minutes: time a job can run before considered stalled
    stalledInterval: 1000 * 60 * 3, // Check for stalled jobs every 3 minutes
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
)

const googleCalendarHealthService = new HealthService(
  googleCalendarWorker,
  'Google Calendar Sync Worker'
)

let isGoogleCalendarShuttingDown = false

googleCalendarWorker.on('completed', (job) => {
  if (isGoogleCalendarShuttingDown) {
    logger.warn(
      `Google Calendar sync job ${job.id}: Worker shutting down, skipping completion handling`
    )
    return
  }
  logger.info(`Google Calendar sync job ${job.id} completed successfully`)
})

googleCalendarWorker.on('failed', (job, error) => {
  if (isGoogleCalendarShuttingDown) {
    logger.warn(
      `Google Calendar sync job ${job?.id}: Worker shutting down, skipping failure handling`
    )
    return
  }
  logger.error(`Google Calendar sync job ${job?.id} failed:`, {
    error: error.message,
    stack: error.stack,
  })
})

googleCalendarWorker.on('error', (error) => {
  logger.error('Google Calendar worker error:', error)
})

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  if (isGoogleCalendarShuttingDown) {
    return
  }

  isGoogleCalendarShuttingDown = true
  logger.info(`${signal} received, shutting down Google Calendar worker gracefully...`)

  try {
    await googleCalendarHealthService.stop()
    await googleCalendarWorker.close()
    logger.info('Google Calendar worker shut down successfully')
  } catch (error) {
    logger.error('Error during Google Calendar worker shutdown:', error)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

logger.info('Google Calendar sync worker started')

export { googleCalendarWorker }
