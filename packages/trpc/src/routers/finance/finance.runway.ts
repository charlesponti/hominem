import { calculateRunway, runwayCalculationSchema } from '@hominem/finance-services'

import { publicProcedure } from '../../procedures'

export const runwayRouter = publicProcedure
  .input(runwayCalculationSchema)
  .mutation(async ({ input }) => {
    try {
      const result = calculateRunway(input)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      console.error('Runway calculation error:', error)
      return {
        success: false,
        error: 'Failed to calculate runway',
      }
    }
  })
