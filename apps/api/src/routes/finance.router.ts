import { queryTransactions } from '@hominem/utils/finance'
import { getActiveJobs, getJobStatus, getUserJobs, queueImportJob } from '@hominem/utils/imports'
import type { ImportTransactionsJob } from '@hominem/utils/types'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'
import { rateLimitImport } from '../middleware/rate-limit'
import { financeAccountsRoutes } from './finance-accounts'
import { financeAnalyzeRoutes } from './finance-analyze'
import { financeExportRoutes } from './finance-export'

export async function financeRoutes(fastify: FastifyInstance) {
  // Register sub-routes
  await fastify.register(financeAccountsRoutes, { prefix: '/accounts' })
  await fastify.register(financeAnalyzeRoutes, { prefix: '/analyze' })
  await fastify.register(financeExportRoutes, { prefix: '/export' })

  const ImportTransactionsSchema = z.object({
    // Base64 encoded from client
    csvContent: z.string().min(1, 'CSV content cannot be empty'),
    fileName: z
      .string()
      .min(1, 'Filename is required')
      .regex(/\.csv$/i, 'File must be a CSV'),
    deduplicateThreshold: z.number().min(0).max(100).default(60),
    batchSize: z.number().min(1).max(100).optional().default(20),
    batchDelay: z.number().min(100).max(1000).optional().default(200),
  })

  const queryOptionsSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    category: z.string().optional(),
    min: z.string().optional(),
    max: z.string().optional(),
    account: z.string().optional(),
    limit: z.coerce.number().optional(),
  })

  fastify.post(
    '/import',
    {
      // Increase file size limit to 5MB to account for CSV files
      bodyLimit: 5 * 1024 * 1024,
      preHandler: [verifyAuth, rateLimitImport],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        const validated = ImportTransactionsSchema.safeParse(request.body)
        if (!validated.success) {
          reply.code(400)
          return {
            error: 'Validation failed',
            details: validated.error.issues,
          }
        }

        // Check if a job with the same filename already exists for this user
        const userJobs = await getUserJobs<ImportTransactionsJob>(userId, 1, 100)
        const existingJob = userJobs.jobs.find(
          (job) =>
            job.fileName === validated.data.fileName &&
            (job.status === 'queued' || job.status === 'uploading' || job.status === 'processing')
        )

        if (existingJob) {
          fastify.log.info(`Found existing job ${existingJob.jobId} for ${validated.data.fileName}`)

          return {
            success: true,
            jobId: existingJob.jobId,
            fileName: existingJob.fileName,
            status: existingJob.status,
            message: 'File is already being processed',
          }
        }

        // Queue job in Redis-based worker system
        const job = await queueImportJob({
          ...validated.data,
          userId,
          maxRetries: 3,
          retryDelay: 1000,
        })

        fastify.log.info(`Queued import job ${job.jobId} for ${validated.data.fileName}`)

        return {
          success: true,
          jobId: job.jobId,
          fileName: job.fileName,
          status: job.status,
        }
      } catch (error) {
        if (error instanceof Error) {
          fastify.log.error(`Import error: ${error.message}`)
          return reply.code(500).send({
            success: false,
            error: 'Failed to process import',
            details: error.message,
          })
        }
        return handleError(error as Error, reply)
      }
    }
  )

  // Check import status endpoint
  fastify.get<{ Params: { jobId: string } }>(
    '/import/:jobId',
    {
      preHandler: verifyAuth,
      schema: {
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const job = await getJobStatus(request.params.jobId)
        if (!job) {
          reply.code(404)
          return { error: 'Import job not found' }
        }
        return job
      } catch (error) {
        fastify.log.error(`Error fetching job status: ${error}`)
        reply.code(500).send({
          error: 'Failed to retrieve job status',
          details: error instanceof Error ? error.message : String(error),
        })
      }
    }
  )

  // List active imports endpoint
  fastify.get('/imports/active', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      const activeJobs = await getActiveJobs()
      return activeJobs
    } catch (error) {
      fastify.log.error(`Error fetching active jobs: ${error}`)
      reply.code(500).send({
        error: 'Failed to retrieve active import jobs',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Get transactions endpoint
  fastify.get('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const queryOptions = queryOptionsSchema.parse(request.query)
      const result = await queryTransactions(queryOptions)
      return result
    } catch (error) {
      fastify.log.error(`Error fetching transactions: ${error}`)
      reply.code(500).send({
        error: 'Failed to retrieve transactions',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })
}
