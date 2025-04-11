import type { Transaction } from '@hominem/utils/schema'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'

export async function financeExportRoutes(fastify: FastifyInstance) {
  // Schema definitions
  const exportTransactionsSchema = z.object({
    format: z.enum(['csv', 'json']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    accounts: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
  })

  // Export transactions endpoint
  fastify.post('/transactions', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = exportTransactionsSchema.parse(request.body)

      // Export logic would go here
      // This is a placeholder implementation
      const format = validated.format

      if (format === 'csv') {
        // Create CSV data
        const exportData = 'Date,Description,Amount,Category\n'
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', 'attachment; filename=transactions.csv')
        //!TODO Add transaction rows
        return exportData
      }

      //!TODO Add transaction objects
      const exportData: Transaction[] = []
      reply.header('Content-Type', 'application/json')
      reply.header('Content-Disposition', 'attachment; filename=transactions.json')
      return exportData
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Export summary report
  fastify.post('/summary', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { userId } = request
      if (!userId) {
        reply.code(401)
        return { error: 'Not authorized' }
      }

      const validated = exportTransactionsSchema.parse(request.body)

      // Generate summary report
      // This is a placeholder implementation
      const format = validated.format

      if (format === 'csv') {
        //!TODO Create CSV summary data
        const summaryData = 'Category,Total Amount\n'
        reply.header('Content-Type', 'text/csv')
        reply.header('Content-Disposition', 'attachment; filename=summary.csv')
        return summaryData
      }

      // Create JSON summary data
      const summaryData = {
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        categorySummary: [],
      }

      reply.header('Content-Type', 'application/json')
      reply.header('Content-Disposition', 'attachment; filename=summary.json')

      return summaryData
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
