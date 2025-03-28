import logger from '@ponti/utils/logger'
import { z } from 'zod'
import {
  findTopMerchants,
  summarizeByCategory,
  summarizeByMonth,
} from '../../../../../../packages/utils/src/finance/finance.service'
import { trpc as t } from '../trpc'

export const transactionsAnalyzeRouter = t.router({
  analyzeTransactions: t.procedure
    .input(
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        by: z.enum(['category', 'month', 'merchant']).default('category'),
        format: z.enum(['table', 'json']).default('table'),
        top: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        let results: Awaited<
          ReturnType<typeof summarizeByCategory | typeof summarizeByMonth | typeof findTopMerchants>
        >

        switch (input.by.toLowerCase()) {
          case 'category':
            results = await summarizeByCategory(input)
            break
          case 'month':
            results = await summarizeByMonth(input)
            break
          case 'merchant':
            results = await findTopMerchants(input)
            break
          default:
            throw new Error(`Unknown analysis dimension: ${input.by}`)
        }
        return { message: 'Analysis complete', results }
      } catch (error) {
        logger.error(error)
        throw new Error(
          `Error analyzing transactions: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})
