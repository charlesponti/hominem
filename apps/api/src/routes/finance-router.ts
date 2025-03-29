import { queryTransactions, type ProcessTransactionOptions } from '@ponti/utils/finance'
import logger from '@ponti/utils/logger'
import { redis } from '@ponti/utils/redis'
import type { ImportJob } from '@ponti/utils/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../middleware/auth'
import { handleError } from '../utils/errors'
import { financeAccountsRoutes } from './finance-accounts'
import { financeAnalyzeRoutes } from './finance-analyze'
import { financeExportRoutes } from './finance-export'

export const IMPORT_JOB_PREFIX = 'import:job:'
export const IMPORT_JOBS_LIST = 'import:active-jobs'

export async function financeRoutes(fastify: FastifyInstance) {
  // Register sub-routes
  await fastify.register(financeAccountsRoutes, { prefix: '/accounts' })
  await fastify.register(financeAnalyzeRoutes, { prefix: '/analyze' })
  await fastify.register(financeExportRoutes, { prefix: '/export' })

  // Schema definitions
  const importTransactionsSchema = z.object({
    csvContent: z.string(),
    fileName: z.string(),
    deduplicateThreshold: z.number().default(60),
    batchSize: z.number().optional(),
    batchDelay: z.number().optional(),
  })

  const queryOptionsSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
    min: z.string().optional(),
    max: z.string().optional(),
    account: z.string().optional(),
    limit: z.number().optional(),
  })

  // Import transactions endpoint
  fastify.post(
    '/import',
    {
      // Increase file size limit to 5MB to account for CSV files
      bodyLimit: 5 * 1024 * 1024,
      preHandler: verifyAuth,
    },
    async (request, reply) => {
      try {
        const { userId } = request
        if (!userId) {
          reply.code(401)
          return { error: 'Not authorized' }
        }

        const validated = importTransactionsSchema.parse(request.body)
        const jobId = crypto.randomUUID()

        try {
          // Queue job in Redis-based worker system
          const job = await queueImportJob(jobId, validated.fileName, {
            fileName: validated.fileName,
            csvContent: validated.csvContent, // Base64 encoded from client
            deduplicateThreshold: validated.deduplicateThreshold,
            batchSize: validated.batchSize || 20,
            batchDelay: validated.batchDelay || 200,
            maxRetries: 3,
            retryDelay: 1000,
          })

          fastify.log.info(`Queued import job ${jobId} for ${validated.fileName}`)

          return {
            success: true,
            jobId: job.jobId,
            fileName: job.fileName,
            status: job.status,
          }
        } catch (workerError) {
          fastify.log.error(`Failed to queue import job: ${workerError}`)
          reply
            .send({
              success: false,
              error: 'Failed to queue import job',
              details: workerError instanceof Error ? workerError.message : String(workerError),
            })
            .code(500)
        }
      } catch (error) {
        handleError(error as Error, reply)
      }
    }
  )

  // Check import status endpoint
  fastify.get('/import/:jobId', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const { jobId } = request.params as { jobId: string }

      try {
        const job = await getJobStatus(jobId)

        if (!job) {
          reply.code(404)
          return { error: 'Import job not found' }
        }

        return job
      } catch (redisError) {
        fastify.log.error(`Error fetching job status from Redis: ${redisError}`)
        reply.code(500)
        return { error: 'Failed to retrieve job status' }
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // List active imports endpoint
  fastify.get('/imports/active', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      try {
        const activeJobs = await getActiveJobs()
        return activeJobs
      } catch (redisError) {
        fastify.log.error(`Error fetching active jobs from Redis: ${redisError}`)
        reply.code(500)
        return { error: 'Failed to retrieve active import jobs' }
      }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get transactions endpoint
  fastify.get('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const queryOptions = queryOptionsSchema.parse(request.query)

      const result = await queryTransactions(queryOptions)

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}

/**
 * Get job status from Redis
 */
export async function getJobStatus(jobId: string): Promise<ImportJob | null> {
  const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
  try {
    const job = await redis.get(jobKey)
    return job ? (JSON.parse(job) as ImportJob) : null
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, error)
    return null
  }
}

/**
 * Get all active import jobs
 */
export async function getActiveJobs(): Promise<ImportJob[]> {
  try {
    const jobIds = await redis.smembers(IMPORT_JOBS_LIST)
    if (!jobIds.length) return []

    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const job = await getJobStatus(jobId)
        return job
      })
    )

    // Filter out null jobs and remove completed jobs from active list
    const validJobs = jobs.filter((job): job is ImportJob => !!job)

    // Clean up completed or errored jobs older than 10 minutes
    const now = Date.now()
    const jobsToRemove = validJobs.filter((job) => {
      const isDone = job.status === 'done' || job.status === 'error'
      const isOld = job.endTime && now - job.endTime > 10 * 60 * 1000 // 10 minutes
      return isDone && isOld
    })

    if (jobsToRemove.length > 0) {
      const jobIdsToRemove = jobsToRemove.map((job) => job.jobId)
      await redis.srem(IMPORT_JOBS_LIST, ...jobIdsToRemove)
    }

    return validJobs
  } catch (error) {
    logger.error('Failed to get active jobs:', error)
    return []
  }
}

/**
 * Queue an import job
 */
export async function queueImportJob(
  jobId: string,
  fileName: string,
  options: ProcessTransactionOptions
): Promise<ImportJob> {
  try {
    // Create initial job record
    const job: ImportJob = {
      jobId,
      fileName,
      status: 'queued',
      startTime: Date.now(),
      stats: {
        progress: 0,
        processingTime: 0,
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
      },
    }

    // Save job to Redis
    await redis.set(`${IMPORT_JOB_PREFIX}${jobId}`, JSON.stringify(job), 'EX', 60 * 60)

    // Add to active jobs list
    // The import function will listen for new jobs in the queue.
    await redis.sadd(IMPORT_JOBS_LIST, jobId)

    return job
  } catch (error) {
    logger.error(`Failed to queue import job ${jobId}:`, error)
    throw error
  }
}
