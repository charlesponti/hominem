import { db } from '@ponti/utils/db'
import {
  aggregateByCategory,
  aggregateByMonth,
  buildWhereConditions,
  parseAmount,
  processTransactionsFromString,
  progressEmitter,
  validateTransactions,
} from '@ponti/utils/finance'
import { financeAccounts, transactions } from '@ponti/utils/schema'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { trpc as t } from '../trpc'

// Keep track of active import jobs
const activeImports = new Map<
  string,
  {
    status: 'running' | 'completed' | 'failed'
    progress: number
    stats: Record<string, unknown>
    error?: string
    startTime: number
    endTime?: number
  }
>()

// Schemas for input validation
const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

const transactionFilterSchema = dateRangeSchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  account: z.string().optional(),
  limit: z.number().default(100),
})

// Updated schema to support all processor configuration options
const importTransactionsInput = z.object({
  csvFile: z.string().nonempty({ message: 'At least one CSV file must be provided' }),
  fileName: z.string().default('transactions.csv'),
  fileDate: z.string().optional(),
  deduplicateThreshold: z.number().default(60),
  batchSize: z.number().optional(),
  batchDelay: z.number().optional(),
  maxRetries: z.number().optional(),
  retryDelay: z.number().optional(),
  dryRun: z.boolean().optional().default(false), // Option to validate without saving
})

export class FinanceRouter {
  // Create router instance
  public router = t.router({
    // Import transactions from CSV file
    importTransactions: t.procedure.input(importTransactionsInput).mutation(async ({ input }) => {
      const jobId = `import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      // Store job in active imports map
      activeImports.set(jobId, {
        status: 'running',
        progress: 0,
        stats: {},
        startTime: Date.now(),
      })

      // Listen for progress events for this job
      const progressListener = (progressData: {
        file: string
        percentage: number
        stats: Record<string, unknown>
      }) => {
        if (progressData.file === input.fileName) {
          const jobInfo = activeImports.get(jobId)
          if (jobInfo) {
            activeImports.set(jobId, {
              ...jobInfo,
              progress: progressData.percentage,
              stats: progressData.stats,
            })
          }
        }
      }

      // Listen for completion events
      const completionListener = (completionData: {
        file: string
        stats: Record<string, unknown>
      }) => {
        if (completionData.file === input.fileName) {
          const jobInfo = activeImports.get(jobId)
          if (jobInfo) {
            activeImports.set(jobId, {
              ...jobInfo,
              status: 'completed',
              progress: 100,
              stats: completionData.stats,
              endTime: Date.now(),
            })
          }

          // Remove listeners
          progressEmitter.removeListener('progress', progressListener)
          progressEmitter.removeListener('complete', completionListener)
        }
      }

      // Add listeners
      progressEmitter.on('progress', progressListener)
      progressEmitter.on('complete', completionListener)

      const summary = {
        success: true,
        jobId,
        originalFileName: input.fileName,
        dryRun: input.dryRun,
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        validationIssues: [] as string[],
        timestamp: new Date().toISOString(),
        deduplicationPercentage: 0,
        processingTime: 0,
        errors: [] as string[],
      }

      const startTime = Date.now()
      const decodedContent = Buffer.from(input.csvFile, 'base64').toString('utf-8')

      try {
        // When in dry run mode, do validation only
        if (input.dryRun) {
          // Parse CSV content (simplified version)
          const csvRows: {
            date: string
            amount: number
            description: string
            accountId: string
          }[] = []
          // Simple parsing implementation for validation
          for (const line of decodedContent.split('\n').slice(1)) {
            if (line.trim()) {
              const values = line.split(',')
              csvRows.push({
                date: values[0] || '',
                amount: Number.parseFloat(values[1] || '0'),
                description: values[2] || '',
                accountId: values[3] || '',
              })
            }
          }

          // Validate transactions
          const validator = validateTransactions(csvRows, input.fileName)
          for await (const result of validator) {
            if (!result.valid) {
              summary.invalid++
              if (result.issue) {
                summary.validationIssues.push(
                  `Row ${summary.total + 1}: ${result.issue} - ${result.transaction.description || 'No description'}`
                )
              }
            }
            summary.total++
          }

          summary.processingTime = (Date.now() - startTime) / 1000

          return {
            ...summary,
            message:
              summary.invalid > 0
                ? `Validation found ${summary.invalid} issues`
                : 'All transactions appear valid',
          }
        }

        // Process transactions normally if not in dry run mode
        const result = processTransactionsFromString({
          fileName: input.fileName,
          csvContent: decodedContent,
          deduplicateThreshold: input.deduplicateThreshold,
          batchSize: input.batchSize,
          batchDelay: input.batchDelay,
          maxRetries: input.maxRetries,
          retryDelay: input.retryDelay,
        })

        for await (const tx of result) {
          switch (tx.action) {
            case 'created':
              summary.created++
              break

            case 'updated':
              summary.updated++
              break

            case 'merged':
              summary.merged++
              break

            case 'skipped':
              summary.skipped++
              break
          }
          summary.total++
        }

        const processed = summary.created + summary.updated + summary.merged
        summary.deduplicationPercentage =
          processed + summary.skipped > 0
            ? Math.round((summary.skipped / (processed + summary.skipped)) * 100)
            : 0

        // Calculate processing time in seconds
        summary.processingTime = (Date.now() - startTime) / 1000

        // Update job status
        const jobInfo = activeImports.get(jobId)
        if (jobInfo) {
          activeImports.set(jobId, {
            ...jobInfo,
            status: 'completed',
            progress: 100,
            endTime: Date.now(),
          })
        }

        return summary
      } catch (error) {
        console.error(error)

        // Calculate processing time even for failed runs
        summary.processingTime = (Date.now() - startTime) / 1000
        summary.success = false

        const errorMessage = error instanceof Error ? error.message : String(error)
        summary.errors.push(errorMessage)

        // Update job status
        const jobInfo = activeImports.get(jobId)
        if (jobInfo) {
          activeImports.set(jobId, {
            ...jobInfo,
            status: 'failed',
            error: errorMessage,
            endTime: Date.now(),
          })
        }

        return {
          ...summary,
          error: errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        }
      } finally {
        // Ensure we clean up listeners
        progressEmitter.removeListener('progress', progressListener)
        progressEmitter.removeListener('complete', completionListener)

        // Remove job info after 1 hour
        setTimeout(
          () => {
            activeImports.delete(jobId)
          },
          60 * 60 * 1000
        )
      }
    }),

    // Get status of a running import job
    getImportStatus: t.procedure.input(z.object({ jobId: z.string() })).query(({ input }) => {
      const jobInfo = activeImports.get(input.jobId)
      if (!jobInfo) {
        throw new Error(`Import job ${input.jobId} not found`)
      }
      return {
        ...jobInfo,
        elapsedTime: jobInfo.endTime
          ? (jobInfo.endTime - jobInfo.startTime) / 1000
          : (Date.now() - jobInfo.startTime) / 1000,
      }
    }),

    // List all active import jobs
    listActiveImports: t.procedure.query(() => {
      return Array.from(activeImports.entries()).map(([id, info]) => ({
        jobId: id,
        ...info,
        elapsedTime: info.endTime
          ? (info.endTime - info.startTime) / 1000
          : (Date.now() - info.startTime) / 1000,
      }))
    }),

    // Get account list
    getAccounts: t.procedure
      .input(
        z
          .object({
            host: z.string().optional(),
            port: z.string().optional(),
          })
          .optional()
      )
      .query(async () => {
        return db.select().from(financeAccounts).orderBy(financeAccounts.name)
      }),

    // Update account details
    updateAccount: t.procedure
      .input(
        z.object({
          id: z.string(),
          data: z.object({
            name: z.string().optional(),
            type: z
              .enum(['checking', 'savings', 'investment', 'credit', 'loan', 'retirement'])
              .optional(),
            institutionId: z.string().optional(),
            balance: z.number().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { id, data } = input

        // Check if account exists
        const account = await db
          .select()
          .from(financeAccounts)
          .where(eq(financeAccounts.id, id))
          .limit(1)
        if (account.length === 0) {
          throw new Error(`Account with ID ${id} not found`)
        }

        const updatedData = {
          ...data,
          balance: data.balance?.toString(),
        }

        await db.update(financeAccounts).set(updatedData).where(eq(financeAccounts.id, id))

        return db.select().from(financeAccounts).where(eq(financeAccounts.id, id)).limit(1)
      }),

    // Query transactions
    queryTransactions: t.procedure.input(transactionFilterSchema).query(async ({ input }) => {
      return db
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          date: transactions.date,
          description: transactions.description,
          accountId: transactions.accountId,
          category: transactions.category,
          note: transactions.note,
          status: transactions.status,
          accountName: financeAccounts.name,
          accountType: financeAccounts.type,
        })
        .from(transactions)
        .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
        .where(buildWhereConditions(input))
        .orderBy(sql`${transactions.date} DESC`)
        .limit(input.limit)
    }),

    // Analyze transactions by different dimensions
    analyzeTransactions: t.procedure
      .input(
        dateRangeSchema.extend({
          dimension: z.enum(['category', 'month']), // removed merchant and account
          top: z.number().default(10),
          host: z.string().optional(),
          port: z.string().optional(),
          json: z.boolean().optional(),
        })
      )
      .query(async ({ input }) => {
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(buildWhereConditions(input))

        const results =
          input.dimension === 'category'
            ? aggregateByCategory(allTransactions)
            : aggregateByMonth(allTransactions)

        return {
          totalTransactions: allTransactions.length,
          totalAmount: allTransactions.reduce((sum, tx) => sum + parseAmount(tx.amount), 0),
          results: results
            .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
            .slice(0, input.top),
        }
      }),

    // Get transaction details by ID
    getTransactionById: t.procedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .query(async ({ input }) => {
        const transaction = await db
          .select()
          .from(transactions)
          .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
          .where(eq(transactions.id, input.id))
          .limit(1)

        if (transaction.length === 0) {
          throw new Error(`Transaction with ID ${input.id} not found`)
        }

        return transaction[0]
      }),

    // Get summary statistics
    getFinanceSummary: t.procedure
      .input(
        dateRangeSchema
          .extend({
            host: z.string().optional(),
            port: z.string().optional(),
            json: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(buildWhereConditions(input || {}))

        // Total accounts
        const uniqueAccounts = await db.select().from(financeAccounts)
        let income = 0
        let expenses = 0

        for (const tx of allTransactions) {
          const amount = parseAmount(tx.amount)
          if (amount > 0) {
            income += amount
          } else {
            expenses += amount
          }
        }

        // Top categories
        const expenseCategories = aggregateByCategory(
          allTransactions.filter((tx) => parseAmount(tx.amount) < 0)
        )

        return {
          transactionCount: allTransactions.length,
          accountCount: uniqueAccounts.length,
          income,
          expenses,
          netCashflow: income + expenses,
          topExpenseCategories: expenseCategories
            .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
            .slice(0, 5)
            .map(({ category, totalAmount }) => ({
              category,
              amount: Math.abs(totalAmount),
            })),
        }
      }),
  })
}
