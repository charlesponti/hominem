import './env.ts'

import { createPlaceImagesService, updatePlacePhotosFromGoogle } from '@hominem/services/places'
import { QUEUE_NAMES } from '@hominem/utils/consts'
import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/services/redis'
import { type Job, Worker } from 'bullmq'
import { env } from './env.ts'
import { HealthService } from './health.service'

const CONCURRENCY = 2

export interface PlacePhotoEnrichPayload {
  placeId: string
  forceFresh?: boolean
}

const processPlacePhotoJob = async (job: Job<PlacePhotoEnrichPayload>) => {
  logger.info(`Processing place photo enrichment job ${job.id} for place ${job.data.placeId}`)
  try {
    const { placeId, forceFresh } = job.data

    // Create required helpers from env
    const apiKey = env.GOOGLE_API_KEY
    const placeImagesService = createPlaceImagesService({
      appBaseUrl: env.APP_BASE_URL,
      googleApiKey: apiKey,
    })

    const result = await updatePlacePhotosFromGoogle(placeId, {
      forceFresh,
      placeImagesService,
      googleApiKey: apiKey,
    })

    if (!result) {
      throw new Error('No photos fetched or update did not change place')
    }

    logger.info(`Place photo enrichment succeeded for place ${placeId}`)
    return { success: true }
  } catch (error) {
    logger.error('Place photo enrichment failed', {
      error: error instanceof Error ? error.message : String(error),
      jobId: job.id,
    })
    throw error
  }
}

const placeWorker = new Worker(QUEUE_NAMES.PLACE_PHOTO_ENRICH, processPlacePhotoJob, {
  connection: redis as any,
  concurrency: CONCURRENCY,
  lockDuration: 1000 * 60 * 2,
  stalledInterval: 1000 * 60 * 1,
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 100 },
})

const healthService = new HealthService(placeWorker, 'Place Photo Enrichment Worker')

let isShuttingDown = false

placeWorker.on('completed', (job) => {
  if (isShuttingDown) {
    return
  }
  logger.info(`Place photo enrichment job ${job.id} completed`)
})

placeWorker.on('failed', (job, error) => {
  if (isShuttingDown) {
    return
  }
  logger.error(`Place photo enrichment job ${job?.id} failed:`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })
})

placeWorker.on('error', (error) => {
  logger.error('Place photo enrichment worker error:', error)
})

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true
  logger.info(`${signal} received, shutting down Place Photo worker...`)
  try {
    await healthService.stop()
    await placeWorker.close()
    logger.info('Place Photo worker shut down')
  } catch (error) {
    logger.error('Error during shutdown of place photo worker:', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

logger.info('Place Photo Enrichment worker started')

export { placeWorker }
