import { db } from '@hominem/utils/db'
import {
  buildWhereConditions,
  calculateTransactions,
  categoryBreakdownSchema,
  findTopMerchants,
  generateTimeSeriesData,
  summarizeByCategory,
} from '@hominem/utils/finance'
import { transactions } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { count, desc, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
export const financeAnalyzeRoutes = new Hono()

const calculateTransactionsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  category: z.string().optional(),
  accounts: z.array(z.string()).optional(),
  type: z.enum(['income', 'expense']).optional(),
})

const timeSeriesQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().optional(),
  groupBy: z.enum(['month', 'week', 'day']).optional().default('month'),
  includeStats: z.coerce.boolean().optional().default(false),
  compareToPrevious: z.coerce.boolean().optional().default(false),
})

const topMerchantsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().optional().default(5),
})

const monthlyStatsParamSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
})

// Get spending over time
financeAnalyzeRoutes.get(
  '/spending-time-series',
  zValidator('query', timeSeriesQuerySchema),
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
      const query = c.req.valid('query')

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

      return c.json(result)
    } catch (error) {
      console.error('Error generating spending time series:', error)
      return c.json(
        {
          error: 'Failed to generate spending time series',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Top merchants endpoint
financeAnalyzeRoutes.get(
  '/top-merchants',
  zValidator('query', topMerchantsQuerySchema),
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
      const query = c.req.valid('query')
      const options = {
        userId,
        from: query.from,
        to: query.to,
        account: query.account,
        category: query.category,
        limit: query.limit,
      }
      const result = await findTopMerchants(options)
      return c.json(result)
    } catch (error) {
      console.error('Error finding top merchants:', error)
      return c.json(
        {
          error: 'Failed to find top merchants',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Category breakdown endpoint
financeAnalyzeRoutes.get(
  '/category-breakdown',
  zValidator('query', categoryBreakdownSchema),
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
      const options = c.req.valid('query')

      const result = await summarizeByCategory({
        ...options,
        userId,
      })
      return c.json(result)
    } catch (error) {
      console.error('Error generating category breakdown:', error)
      return c.json(
        {
          error: 'Failed to generate category breakdown',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Calculate Transactions
financeAnalyzeRoutes.post(
  '/calculate',
  zValidator('json', calculateTransactionsSchema),
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

      const result = await calculateTransactions({
        ...validated,
        userId,
      })

      return c.json(result)
    } catch (error) {
      console.error('Error calculating transactions:', error)
      return c.json(
        {
          error: 'Failed to calculate transactions',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

financeAnalyzeRoutes.get(
  '/monthly-stats/:month',
  zValidator('param', monthlyStatsParamSchema),
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
      const { month } = c.req.valid('param') // Format: YYYY-MM

      // Calculate start and end dates for the month (inclusive start, exclusive end)
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const endDate = new Date(startDate)
      endDate.setMonth(startDate.getMonth() + 1)

      // Use standardized condition building with month date range
      const monthFilter = buildWhereConditions({
        userId,
        from: startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
        to: endDate.toISOString().split('T')[0],
      })

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
      const categorySpendingFilter = buildWhereConditions({
        userId,
        from: startDate.toISOString().split('T')[0],
        to: endDate.toISOString().split('T')[0],
        type: 'expense',
      })

      const categorySpendingResult = await db
        .select({
          category: transactions.category,
          amount: sql<number>`sum(abs(${transactions.amount}::numeric))`.mapWith(Number),
        })
        .from(transactions)
        .where(categorySpendingFilter)
        .groupBy(transactions.category)
        .orderBy(desc(sql<number>`sum(abs(${transactions.amount}::numeric))`))

      const stats = {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        transactionCount,
        categorySpending: categorySpendingResult.map((c) => ({
          name: c.category,
          amount: c.amount,
        })),
      }

      return c.json(stats)
    } catch (error) {
      console.error('Error fetching monthly stats:', error)
      return c.json(
        {
          error: 'Failed to retrieve monthly statistics',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
