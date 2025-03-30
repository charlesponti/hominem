import { queryTransactions } from '@ponti/utils/finance'
import { getActiveJobs, getJobStatus, queueImportJob } from '@ponti/utils/imports'
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

  // Schema definitions
  const importTransactionsSchema = z.object({
    csvContent: z.string().min(1, 'CSV content cannot be empty'),
    fileName: z
      .string()
      .min(1, 'Filename is required')
      .regex(/\.csv$/i, 'File must be a CSV'),
    deduplicateThreshold: z.number().min(0).max(100).default(60),
    batchSize: z.number().min(1).max(100).optional(),
    batchDelay: z.number().min(100).max(1000).optional(),
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
      preHandler: [verifyAuth, rateLimitImport],
    },
    async (request, reply) => {
      try {
        const validated = importTransactionsSchema.safeParse(request.body)

        if (!validated.success) {
          reply.code(400)
          return {
            error: 'Validation failed',
            details: validated.error.issues,
          }
        }

        // Queue job in Redis-based worker system
        const job = await queueImportJob({
          fileName: validated.data.fileName,
          csvContent: validated.data.csvContent, // Base64 encoded from client
          deduplicateThreshold: validated.data.deduplicateThreshold,
          batchSize: validated.data.batchSize || 20,
          batchDelay: validated.data.batchDelay || 200,
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
          reply.code(500).send({
            success: false,
            error: 'Failed to process import',
            details: error.message,
          })
        } else {
          handleError(error as Error, reply)
        }
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
