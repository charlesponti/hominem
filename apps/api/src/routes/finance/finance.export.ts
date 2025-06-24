import type { FinanceTransaction } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
export const financeExportRoutes = new Hono()

// Schema definitions
const exportTransactionsSchema = z.object({
  format: z.enum(['csv', 'json']),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accounts: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
})

// Export transactions endpoint
financeExportRoutes.post(
  '/transactions',
  zValidator('json', exportTransactionsSchema),
  async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const validated = c.req.valid('json')

      // Export logic would go here
      // This is a placeholder implementation
      const format = validated.format

      if (format === 'csv') {
        // Create CSV data
        const exportData = 'Date,Description,Amount,Category\n'
        c.header('Content-Type', 'text/csv')
        c.header('Content-Disposition', 'attachment; filename=transactions.csv')
        //!TODO Add transaction rows
        return c.text(exportData)
      }

      //!TODO Add transaction objects
      const exportData: FinanceTransaction[] = []
      c.header('Content-Type', 'application/json')
      c.header('Content-Disposition', 'attachment; filename=transactions.json')
      return c.json(exportData)
    } catch (error) {
      console.error('Error exporting transactions:', error)
      return c.json(
        {
          error: 'Failed to export transactions',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Export summary report
financeExportRoutes.post(
  '/summary',
  zValidator('json', exportTransactionsSchema),
  async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }


    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      const validated = c.req.valid('json')

      // Generate summary report
      // This is a placeholder implementation
      const format = validated.format

      if (format === 'csv') {
        //!TODO Create CSV summary data
        const summaryData = 'Category,Total Amount\n'
        c.header('Content-Type', 'text/csv')
        c.header('Content-Disposition', 'attachment; filename=summary.csv')
        return c.text(summaryData)
      }

      // Create JSON summary data
      const summaryData = {
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0,
        categorySummary: [],
      }

      c.header('Content-Type', 'application/json')
      c.header('Content-Disposition', 'attachment; filename=summary.json')

      return c.json(summaryData)
    } catch (error) {
      console.error('Error exporting summary:', error)
      return c.json(
        {
          error: 'Failed to export summary',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
