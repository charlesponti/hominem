import {
  calculateTransactions,
  categoryBreakdownSchema,
  findTopMerchants,
  generateTimeSeriesData,
  getBudgetCategorySuggestions,
  summarizeByCategory,
} from '@hominem/utils/finance'
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
}
