import { QUEUE_NAMES } from '@hominem/utils/consts'
import { db } from '@hominem/utils/db'
import {
  FinancialAccountService,
  getBudgetCategories,
  queryTransactions,
} from '@hominem/utils/finance'
import { getJobStatus, getUserJobs } from '@hominem/utils/imports'
import {
  budgetCategories,
  budgetGoals,
  financeAccounts,
  insertTransactionSchema,
  plaidItems,
  transactions,
  updateTransactionSchema,
} from '@hominem/utils/schema'
import type { ImportTransactionsJob } from '@hominem/utils/types'
import { and, count, desc, eq, gte, lt, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors.js'
import { verifyAuth } from '../../middleware/auth.js'
import { rateLimitImport } from '../../middleware/rate-limit.js'
import { financeAccountsRoutes } from './finance-accounts.js'
import { financeAnalyzeRoutes } from './finance-analyze.js'
import { financeExportRoutes } from './finance-export.js'

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

        // Use BullMQ instead of Redis directly
        const job = await fastify.queues.importTransactions.add(
          QUEUE_NAMES.IMPORT_TRANSACTIONS,
          {
            ...validated.data,
            userId,
            // BullMQ provides the job ID, so we don't need to create one
            fileName: validated.data.fileName,
            status: 'queued',
            createdAt: Date.now(),
            type: 'import-transactions',
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }
        )

        fastify.log.info(`Queued import job ${job.id}`)

        return {
          success: true,
          jobId: job.id,
          fileName: validated.data.fileName,
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
        .filter((job) => job.data.userId === userId)
        .map((job) => ({
          jobId: job.id,
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
    description: z.string().optional().describe('Description search term'),
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

      const [newTransaction] = await db
        .insert(transactions)
        .values({ ...validatedData, userId })
        .returning()

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

      // Verify transaction exists and belongs to the user
      const existingTransaction = await db.query.transactions.findFirst({
        where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      })

      if (!existingTransaction) {
        return reply.code(404).send({ error: 'Transaction not found' })
      }

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

      const [updatedTransaction] = await db
        .update(transactions)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning()

      return updatedTransaction
    } catch (error) {
      handleError(error as Error, reply)
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
      const result = await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))

      if (result.count === 0) {
        return reply.code(404).send({ error: 'Transaction not found' })
      }

      return { success: true, message: 'Transaction deleted successfully' }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  const monthlyStatsParamsSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  })

  fastify.get('/monthly-stats/:month', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }

    try {
      const params = monthlyStatsParamsSchema.parse(request.params)
      const { month } = params // Format: YYYY-MM

      // Calculate start and end dates for the month (inclusive start, exclusive end)
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(startDate.getMonth() + 1)

      const monthFilter = and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate), // Use Date object directly
        lt(transactions.date, endDate) // Use Date object directly
      )

      // --- Database Queries ---

      // 1. Calculate Total Income, Total Expenses, and Transaction Count
      const totalsResult = await db
        .select({
          totalIncome:
            sql<number>`sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end)`.mapWith(
              Number
            ),
          totalExpenses:
            sql<number>`sum(case when ${transactions.amount} < 0 then abs(${transactions.amount}) else 0 end)`.mapWith(
              Number
            ),
          transactionCount: count(),
        })
        .from(transactions)
        .where(monthFilter)

      const { totalIncome = 0, totalExpenses = 0, transactionCount = 0 } = totalsResult[0] ?? {}

      // 2. Calculate Spending by Category (only expenses)
      const categorySpendingResult = await db
        .select({
          category: transactions.category,
          amount: sql<number>`sum(abs(${transactions.amount}::numeric))`.mapWith(Number), // Cast amount to numeric for sum/abs
        })
        .from(transactions)
        .where(
          and(
            monthFilter,
            lt(transactions.amount, '0'),
            or(eq(transactions.type, 'income'), eq(transactions.type, 'expense'))
          )
        ) // Compare amount as string
        .groupBy(transactions.category)
        .orderBy(desc(sql<number>`sum(abs(${transactions.amount}::numeric))`)) // Cast amount to numeric for sum/abs

      // --- Format Results ---
      const netIncome = totalIncome - totalExpenses

      const stats = {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount,
        categorySpending: categorySpendingResult.map((c) => ({
          name: c.category,
          amount: c.amount,
        })),
        // Optionally fetch top transactions or other details here if needed
      }

      return stats
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.issues,
        })
      }
      fastify.log.error(`Error fetching monthly stats: ${error}`)
      return reply.code(500).send({
        error: 'Failed to retrieve monthly statistics',
        details: error instanceof Error ? error.message : String(error),
      })
    }
  })

  // Delete all finance data for the authenticated user
  fastify.delete('/', { preHandler: verifyAuth }, async (request, reply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ error: 'Not authorized' })
    }
    try {
      await db.delete(transactions).where(eq(transactions.userId, userId))
      await db.delete(financeAccounts).where(eq(financeAccounts.userId, userId))
      await db.delete(budgetGoals).where(eq(budgetGoals.userId, userId))
      await db.delete(budgetCategories).where(eq(budgetCategories.userId, userId))
      await db.delete(plaidItems).where(eq(plaidItems.userId, userId))
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
      const categories = await db
        .select({
          category: transactions.category,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense')))
        .groupBy(transactions.category)
        .orderBy(transactions.category)

      // !TODO: Implement logic to analyze spending categories
      return categories
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get Budget Categories
  fastify.get('/budget-categories', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const result = await getBudgetCategories({ userId })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
