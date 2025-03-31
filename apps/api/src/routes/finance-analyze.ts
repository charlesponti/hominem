import { db } from '@ponti/utils/db'
import { transactions } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'
import { generateTimeSeriesData } from '../services/finance-analyze.service'

export async function financeAnalyzeRoutes(fastify: FastifyInstance) {
  // Schema definitions
  const analyzeTransactionsSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.string().optional(),
    accounts: z.array(z.string()).optional(),
  })

  const aggregationType = z.enum(['monthly', 'weekly', 'daily', 'category'])

  const aggregateTransactionsSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: aggregationType.optional(),
    accounts: z.array(z.string()).optional(),
  })

  // Analyze transactions endpoint
  fastify.post('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = analyzeTransactionsSchema.parse(request.body)

      // Analysis logic would go here
      // This is a placeholder implementation
      const analysisResult = {
        totalSpent: 0,
        averageTransaction: 0,
        largestTransaction: 0,
        categories: [],
        trends: [],
      }

      return analysisResult
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Aggregate transactions endpoint
  fastify.post('/aggregate', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = aggregateTransactionsSchema.parse(request.body)

      // Aggregation logic would go here
      // This is a placeholder implementation
      const aggregationType = validated.type || 'monthly'
      // !TODO Implement aggregation logic
      // const aggregatedData = []

      return {
        type: aggregationType,
        // data: aggregatedData,
      }
    } catch (error) {
      handleError(error as Error, reply)
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
        .where(eq(transactions.userId, userId))
        .groupBy(transactions.category)
        .orderBy(transactions.category)

      // !TODO: Implement logic to analyze spending categories
      return categories
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Parse query parameters
  const timeSeriesQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    account: z.string().optional(),
    category: z.string().optional(),
    limit: z.string().transform(Number).optional(),
    groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
    includeStats: z.boolean().optional().default(false),
    compareToPrevious: z.boolean().optional().default(false),
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
      })

      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
