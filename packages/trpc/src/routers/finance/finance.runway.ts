import { calculateRunway, calculateRunwayProjection } from '@hominem/services/finance'
import { z } from 'zod'
import { publicProcedure } from '../../procedures'

export const runwayRouter = publicProcedure
  .input(
    z.object({
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
  )
  .mutation(async ({ input }) => {
    try {
      const runwayResult = calculateRunway(input)
      const projectionData = calculateRunwayProjection(input)

      return {
        success: true,
        data: {
          ...runwayResult,
          projectionData,
        },
      }
    } catch (error) {
      console.error('Runway calculation error:', error)
      return {
        success: false,
        error: 'Failed to calculate runway',
      }
    }
  })
