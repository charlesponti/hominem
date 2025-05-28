import { QUEUE_NAMES } from '@hominem/utils/consts'
import {
  createNewTransaction,
  deleteAllFinanceData,
  deleteTransaction,
  FinancialAccountService,
  getFinancialInstitutions,
  getSpendingCategories,
  queryTransactions,
  updateTransaction,
} from '@hominem/utils/finance'
import { getJobStatus, getUserJobs } from '@hominem/utils/imports'
import type { ImportTransactionsJob, ImportTransactionsQueuePayload } from '@hominem/utils/jobs'
import { insertTransactionSchema, updateTransactionSchema } from '@hominem/utils/schema'
import { csvStorageService } from '@hominem/utils/supabase'
import type { Job } from 'bullmq'
import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import { z } from 'zod'
import { handleError } from '../../lib/errors.js'
import { verifyAuth } from '../../middleware/auth.js'
import { handleFileUpload } from '../../middleware/file-upload.js'
import { rateLimitImport } from '../../middleware/rate-limit.js'
import { budgetRoutes } from './budget.router.js'
import { financeAccountsRoutes } from './finance-accounts.js'
import { financeAnalyzeRoutes } from './finance-analyze.js'
import { financeExportRoutes } from './finance-export.js'

export async function financeRoutes(fastify: FastifyInstance) {
  // Register sub-routes
  await fastify.register(financeAccountsRoutes, { prefix: '/accounts' })
  await fastify.register(financeAnalyzeRoutes, { prefix: '/analyze' })
  await fastify.register(financeExportRoutes, { prefix: '/export' })
  await fastify.register(budgetRoutes, { prefix: '/budget' })

  // Get all financial institutions
  fastify.get(
    '/institutions',
    {
      preHandler: [verifyAuth],
      schema: {
        tags: ['Finance'],
        summary: 'Get all financial institutions',
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                logo: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const institutions = await getFinancialInstitutions()
        return institutions
      } catch (error) {
        return handleError(error as Error, reply)
      }
    }
  )

  // Update schema to handle file uploads instead of base64 content
  const ImportTransactionsParamsSchema = z.object({
    deduplicateThreshold: z.coerce.number().min(0).max(100).default(60),
    batchSize: z.coerce.number().min(1).max(100).optional().default(20),
    batchDelay: z.coerce.number().min(100).max(1000).optional().default(200),
  })

  fastify.post(
    '/import',
    {
      // Increase file size limit to 50MB for CSV files
      bodyLimit: 50 * 1024 * 1024,
      preHandler: [verifyAuth, rateLimitImport],
    },
    async (request, reply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ error: 'Not authorized' })
      }

      try {
        // Parse query parameters for options
        const options = ImportTransactionsParamsSchema.parse(request.query)

        // Handle multipart file upload
        const uploadedFile = await handleFileUpload(request)

        if (!uploadedFile) {
          return reply.code(400).send({ error: 'No file uploaded' })
        }

        if (!uploadedFile.mimetype.includes('csv')) {
          // Clean up the temp file
          fs.unlinkSync(uploadedFile.filepath)
          return reply.code(400).send({ error: 'Only CSV files are supported' })
        }

        // Read the CSV file content
        const csvContent = fs.readFileSync(uploadedFile.filepath, 'utf-8')

        // Upload CSV file to Supabase storage
        const csvFilePath = await csvStorageService.uploadCsvFile(
          uploadedFile.filename,
          csvContent,
          userId
        )

        // Clean up the temp file
        fs.unlinkSync(uploadedFile.filepath)

        // Check if a job with the same filename already exists for this user
        const userJobs = await getUserJobs<ImportTransactionsJob>(userId, 1, 100)
        const existingJob = userJobs.jobs.find(
          (job) =>
            job.fileName === uploadedFile.filename &&
            (job.status === 'queued' || job.status === 'uploading' || job.status === 'processing')
        )

        if (existingJob) {
          fastify.log.info(`Found existing job ${existingJob.jobId} for ${uploadedFile.filename}`)

          return {
            success: true,
            jobId: existingJob.jobId,
            fileName: existingJob.fileName,
            status: existingJob.status,
            message: 'File is already being processed',
          }
        }

        // Use BullMQ with file path instead of CSV content
        const job = await fastify.queues.importTransactions.add(
          QUEUE_NAMES.IMPORT_TRANSACTIONS,
          {
            csvFilePath,
            fileName: uploadedFile.filename,
            deduplicateThreshold: options.deduplicateThreshold,
            batchSize: options.batchSize,
            batchDelay: options.batchDelay,
            userId,
            status: 'queued',
            createdAt: Date.now(),
            type: 'import-transactions',
          } as ImportTransactionsQueuePayload,
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }
        )

        fastify.log.info(`Queued import job ${job.id} with file ${csvFilePath}`)

        return {
          success: true,
          jobId: job.id,
          fileName: uploadedFile.filename,
          status: 'queued',
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
    { preHandler: verifyAuth },
    async (request, reply) => {
      const paramsSchema = z.object({
        jobId: z.string().min(1, 'jobId is required'),
      })
      const parsed = paramsSchema.safeParse(request.params)
      if (!parsed.success) {
        reply.code(400)
        return {
          error: 'Validation failed',
          details: parsed.error.issues,
        }
      }

      const { jobId } = parsed.data

      try {
        // With BullMQ, we can get the job status directly
        const job = await fastify.queues.importTransactions.getJob(jobId)

        if (!job) {
          // Try the legacy job status method as a fallback
          const legacyJob = await getJobStatus(jobId)
          if (!legacyJob) {
            reply.code(404)
            return { error: 'Import job not found' }
          }
          return legacyJob
        }

        // Map BullMQ job to our expected format
        return {
          jobId: job.id,
          status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
          fileName: job.data.fileName,
          progress: job.progress,
          error: job.failedReason,
          stats: job.returnvalue?.stats || {},
        }
      } catch (error) {
        fastify.log.error(`Error fetching job status: ${error}`)
        return reply.code(500).send({
          error: 'Failed to retrieve job status',
          details: error instanceof Error ? error.message : String(error),
        })
      }
    }
  )

  fastify.get('/imports/active', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      // With BullMQ, we can get active jobs directly
      const activeJobs = await fastify.queues.importTransactions.getJobs([
        'active',
        'waiting',
        'delayed',
      ])

      // Filter to only get this user's jobs and map to our expected format
      const userJobs = activeJobs
        .filter((job: Job<ImportTransactionsQueuePayload>) => job.data.userId === userId)
        .map((job: Job<ImportTransactionsQueuePayload>) => ({
          jobId: job.id as string,
          userId: job.data.userId,
          fileName: job.data.fileName,
          status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
          progress: job.progress,
        }))

      return { jobs: userJobs }
    } catch (error) {
      fastify.log.error(`Error fetching active jobs: ${error}`)
      return reply.code(500).send({
        error: 'Failed to retrieve active import jobs',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  const queryOptionsSchema = z.object({
    from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    to: z.string().optional().describe('End date in YYYY-MM-DD format'),
    category: z.string().optional().describe('Transaction category'),
    min: z.string().optional().describe('Minimum transaction amount'),
    max: z.string().optional().describe('Maximum transaction amount'),
    account: z.string().optional().describe('Account filter'),
    limit: z.coerce.number().optional().describe('Maximum results to return'),
    offset: z.coerce.number().optional().describe('Number of results to skip for pagination'), // Added offset
    description: z.string().optional().describe('Description search term'),
    search: z.string().optional().describe('Free text search across multiple fields'),
    // Allow sortBy and sortDirection to be a string or an array of strings
    sortBy: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Field(s) to sort by'),
    sortDirection: z
      .union([z.enum(['asc', 'desc']), z.array(z.enum(['asc', 'desc']))])
      .optional()
      .describe('Sort direction(s)'),
  })

  fastify.get('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }
    try {
      const queryOptions = queryOptionsSchema.parse(request.query)
      const result = await queryTransactions({ ...queryOptions, userId })
      return result
    } catch (error) {
      fastify.log.error(`Error fetching transactions: ${error}`)
      return reply.code(500).send({
        error: 'Failed to retrieve transactions',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Add Transaction
  fastify.post('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      const validatedData = insertTransactionSchema.omit({ userId: true }).parse(request.body)

      // Optional: Validate accountId exists for the user
      if (validatedData.accountId) {
        const account = await FinancialAccountService.getAccountById(
          validatedData.accountId,
          userId
        )
        if (!account) {
          return reply.code(404).send({ error: 'Account not found' })
        }
      }

      const newTransaction = await createNewTransaction({ ...validatedData, userId })
      return reply.code(201).send(newTransaction)
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update Transaction
  fastify.put('/transactions/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    const { id } = request.params as { id: string }

    try {
      const validatedData = updateTransactionSchema.partial().parse(request.body) // Allow partial updates

      // Optional: Validate accountId if provided
      if (validatedData.accountId) {
        const account = await FinancialAccountService.getAccountById(
          validatedData.accountId,
          userId
        )
        if (!account) {
          return reply.code(404).send({ error: 'Account not found' })
        }
      }

      const updatedTransaction = await updateTransaction(id, userId, validatedData)
      return updatedTransaction
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Delete Transaction
  fastify.delete('/transactions/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    const { id } = request.params as { id: string }

    try {
      await deleteTransaction(id, userId)
      return { success: true, message: 'Transaction deleted successfully' }
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Delete all finance data for the authenticated user
  fastify.delete('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }
    try {
      await deleteAllFinanceData(userId)
      return { success: true, message: 'All finance data deleted' }
    } catch (err) {
      fastify.log.error(`Error deleting finance data: ${err}`)
      return reply.code(500).send({
        error: 'Failed to delete finance data',
        details: err instanceof Error ? err.message : String(err),
      })
    }
  })

  // Get spending categories
  fastify.get('/categories', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      // Logic to get spending categories
      const categories = await getSpendingCategories(userId)

      // !TODO: Implement logic to analyze spending categories
      return categories
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })
}
