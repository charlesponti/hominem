import { db } from '@hominem/utils/db'
import {
  calculateTransactions,
  categoryBreakdownSchema,
  findTopMerchants,
  generateTimeSeriesData,
  getBudgetCategorySuggestions,
  summarizeByCategory,
} from '@hominem/utils/finance'
import { transactions } from '@hominem/utils/schema'
import { and, count, desc, eq, gte, lt, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../../lib/errors.js'
import { verifyAuth } from '../../middleware/auth.js'

export async function financeAnalyzeRoutes(fastify: FastifyInstance) {
  const calculateTransactionsSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.string().optional(),
    accounts: z.array(z.string()).optional(),
    type: z.enum(['income', 'expense']).optional(),
  })

  const budgetCategorySuggestionsSchema = z.object({
    description: z.string(),
    amount: z.number().optional(),
  })

  // Parse query parameters
  const timeSeriesQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    account: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
    includeStats: z.coerce.boolean().optional().default(false),
    compareToPrevious: z.coerce.boolean().optional().default(false),
  })

  // Get spending over time
  fastify.get('/spending-time-series', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const query = timeSeriesQuerySchema.parse(request.query)

      // Use the service to generate time series data
      const result = await generateTimeSeriesData({
        from: query.from,
        to: query.to,
        account: query.account,
        category: query.category,
        limit: query.limit,
        groupBy: query.groupBy,
        includeStats: query.includeStats,
        compareToPrevious: query.compareToPrevious,
        userId,
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Top merchants endpoint
  fastify.get('/top-merchants', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }
      const query = request.query as Record<string, string>
      const options = {
        userId,
        from: query.from,
        to: query.to,
        account: query.account,
        category: query.category,
        limit: query.limit ? Number.parseInt(query.limit) : 5,
      }
      const result = await findTopMerchants(options)
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Category breakdown endpoint
  fastify.get('/category-breakdown', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }
      const query = request.query as Record<string, string>
      const options = categoryBreakdownSchema.parse(query)

      const result = await summarizeByCategory({
        ...options,
        userId,
      })
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Calculate Transactions
  fastify.post('/calculate', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = calculateTransactionsSchema.parse(request.body)

      const result = await calculateTransactions({
        ...validated,
        userId,
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Get Budget Category Suggestions
  fastify.post(
    '/budget-category-suggestions',
    { preHandler: verifyAuth },
    async (request, reply) => {
      try {
        const { userId } = request
        if (!userId) {
          reply.code(401)
          return { error: 'Not authorized' }
        }

        const validated = budgetCategorySuggestionsSchema.parse(request.body)

        const result = await getBudgetCategorySuggestions({
          ...validated,
          userId,
        })

        return result
      } catch (error) {
        handleError(error as Error, reply)
      }
    }
  )

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
}
