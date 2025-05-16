/**
 * Finance module
 */

import { z } from 'zod'

// Export types
export * from './types'

// Export services and utilities
export { generateCategoryTimeSeriesData, generateTimeSeriesData } from './finance-analyze.service'
export * from './finance.service'
export { tools } from './finance.tools'
export { default as FinancialAccountService } from './financial-account.service'
export * from './transactions-processor'

export const categoryBreakdownSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  account: z.string().optional(),
  limit: z.string().transform(Number).optional().default('5'),
})

export const runwayCalculationSchema = z.object({
  balance: z.number().positive(),
  monthlyExpenses: z.number().positive(),
  plannedPurchases: z
    .array(
      z.object({
        description: z.string(),
        amount: z.number().positive(),
        date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
          message: 'Invalid date format',
        }),
      })
    )
    .optional(),
})
