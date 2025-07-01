import './env.ts'

import { QUEUE_NAMES, REDIS_CHANNELS } from '@hominem/utils/consts'
import { processTransactionsFromCSV } from '@hominem/utils/finance'
import type {
  ImportTransactionsJob,
  ImportTransactionsQueuePayload,
  JobStats,
} from '@hominem/utils/jobs'
import { type Job, Worker } from 'bullmq'
import { Effect } from 'effect'
import { HealthService } from './health.service'
import { AppLive, CsvStorage, Logger, Redis } from './services'

const CONCURRENCY = process.env.WORKER_CONCURRENCY
  ? Number.parseInt(process.env.WORKER_CONCURRENCY, 10)
  : 3

const program = Effect.gen(function* ($) {
  const logger = yield* $(Logger)
  const redis = yield* $(Redis)

  const processJob = (job: Job<ImportTransactionsQueuePayload>) =>
    Effect.gen(function* ($) {
      const csvStorage = yield* $(CsvStorage)
      if (!job.id) {
        return yield* $(Effect.fail(new Error('Job ID is undefined, cannot process BullMQ job.')))
      }

      logger.info(`Processing job ${job.id} (${job.data.fileName}) for user ${job.data.userId}`)

      const stats: JobStats = {
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        errors: [],
        progress: 0,
        processingTime: 0,
      }
      const startTime = Date.now()

      yield* $(Effect.tryPromise(() => job.updateProgress(0)))

      if (!job.data.csvFilePath) {
        return yield* $(Effect.fail(new Error(`CSV file path not found in job ${job.id}`)))
      }

      const decodedContent = (yield* $(
        Effect.tryPromise(() => csvStorage.downloadCsvFile(job.data.csvFilePath as string))
      )) as string

      if (!decodedContent || decodedContent.trim().length === 0) {
        return yield* $(Effect.fail(new Error('Downloaded CSV content is empty')))
      }

      const updateBullJobProgress = (progress: number) =>
        Effect.tryPromise(() => job.updateProgress(progress))

      const jobData: ImportTransactionsJob = {
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        csvContent: decodedContent,
        type: 'import-transactions',
        status: 'processing',
        options: {
          deduplicateThreshold: job.data.deduplicateThreshold,
          batchSize: job.data.batchSize,
          batchDelay: job.data.batchDelay,
        },
        stats: { progress: 0 },
        startTime: job.timestamp,
      }

      let processedCount = 0
      const totalLinesToProcess = Math.max(
        1,
        decodedContent.split('\n').length - (decodedContent.includes('\n') ? 1 : 0)
      )
      let lastReportedProgress = -1
      const progressUpdateInterval = 1000 // 1 second
      let lastProgressUpdateTime = Date.now()

      const countableActionKeys: ReadonlyArray<
        keyof Pick<JobStats, 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'>
      > = ['created', 'updated', 'skipped', 'merged', 'invalid']

      const isCountableActionKey = (key: string): key is (typeof countableActionKeys)[number] => {
        return countableActionKeys.includes(key as (typeof countableActionKeys)[number])
      }

      jobData.stats.total = 0

      const results = yield* $(processTransactionsFromCSV(jobData))

      for (const result of results) {
        processedCount++
        jobData.stats.total = (jobData.stats.total || 0) + 1

        if (result.action) {
          if (isCountableActionKey(result.action)) {
            jobData.stats[result.action] = (jobData.stats[result.action] ?? 0) + 1
          } else {
            logger.warn(
              `Job ${job.id}: Received unexpected action key '${result.action}' from processor`
            )
          }
        }

        const currentProgress = Math.min(
          99,
          Math.round((processedCount / totalLinesToProcess) * 100)
        )

        if (jobData.stats) {
          jobData.stats.progress = currentProgress
        }

        const now = Date.now()
        if (now - lastProgressUpdateTime > progressUpdateInterval) {
          if (currentProgress !== lastReportedProgress) {
            yield* $(updateBullJobProgress(currentProgress))
            lastReportedProgress = currentProgress
          }
          lastProgressUpdateTime = now
        }
      }

      stats.progress = 100
      stats.processingTime = Date.now() - startTime

      yield* $(Effect.tryPromise(() => job.updateProgress(100)))

      logger.info(`BullMQ job ${job.id} completed successfully`, {
        stats,
        processingTime: stats.processingTime,
      })

      return {
        success: true,
        stats,
      }
    }).pipe(
      Effect.catchAll((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(
          {
            error: {
              name: error instanceof Error ? error.name : 'Unknown',
              message: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
              cause: error instanceof Error ? error.cause : undefined,
            },
            jobId: job.id,
            jobData: {
              fileName: job.data.fileName,
              userId: job.data.userId,
              csvFilePath: job.data.csvFilePath,
            },
          },
          `Error processing job ${job.id}`
        )
        return Effect.fail(error)
      })
    )

  const worker = new Worker(QUEUE_NAMES.IMPORT_TRANSACTIONS, (job) =>
    Effect.runPromise(
      processJob(job!).pipe(Effect.provide(AppLive)) as Effect.Effect<
        { success: boolean; stats: JobStats },
        unknown,
        never
      >
    )
  )

  const healthService = new HealthService(worker, 'Transaction Import Worker')

  worker.on('active', (job: Job<ImportTransactionsQueuePayload>) => {
    logger.info(`Job ${job.id} (${job.data.fileName}) started processing`)
  })

  worker.on('completed', async (job, result) => {
    logger.info(`Job ${job.id} completed successfully`)
    const finalStats = result?.stats || {}
    await redis.publish(
      REDIS_CHANNELS.IMPORT_PROGRESS,
      JSON.stringify([
        {
          jobId: job.id,
          status: 'done',
          stats: {
            progress: 100,
            processingTime: job.processedOn
              ? Date.now() - job.processedOn
              : result?.stats?.processingTime || 0,
            ...finalStats,
          },
          fileName: job.data.fileName,
          userId: job.data.userId,
        },
      ])
    )
  })

  worker.on('failed', (job, error) => {
    logger.error({ error, jobId: job?.id }, `Job ${job?.id} failed`)
    if (job) {
      redis.publish(
        REDIS_CHANNELS.IMPORT_PROGRESS,
        JSON.stringify([
          {
            jobId: job.id,
            status: 'error',
            error: error.message,
            fileName: job.data.fileName,
            userId: job.data.userId,
          },
        ])
      )
    }
  })

  worker.on('error', (error: Error) => {
    logger.error({ error }, 'Worker error')
  })

  worker.on('progress', (job, progress) => {
    logger.debug(
      `Job ${job.id} progress: ${typeof progress === 'number' ? `${progress}%` : JSON.stringify(progress)}`
    )
    const progressPercentage = typeof progress === 'number' ? progress : job.progress
    redis.publish(
      REDIS_CHANNELS.IMPORT_PROGRESS,
      JSON.stringify([
        {
          jobId: job.id,
          status: 'processing',
          stats: {
            progress: progressPercentage,
            processingTime: Date.now() - (job.processedOn || job.timestamp),
          },
          fileName: job.data.fileName,
          userId: job.data.userId,
        },
      ])
    )
  })

  const shutdown = (signal: string) =>
    Effect.gen(function* ($) {
      logger.info(`Received ${signal}, shutting down gracefully...`)
      yield* $(Effect.tryPromise(() => worker.close()))
      logger.info('Worker closed successfully')
    })

  process.on('SIGTERM', () => Effect.runPromise(shutdown('SIGTERM')))
  process.on('SIGINT', () => Effect.runPromise(shutdown('SIGINT')))
})

Effect.runPromise(program.pipe(Effect.provide(AppLive)))
