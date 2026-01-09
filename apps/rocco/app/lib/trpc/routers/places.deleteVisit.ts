import { deleteEvent } from '@hominem/data/events'
import { z } from 'zod'
import { protectedProcedure } from '../context'

export const deleteVisit = protectedProcedure
  .input(z.object({ visitId: z.uuid() }))
  .mutation(async ({ input }) => {
    const deleted = await deleteEvent(input.visitId)

    if (!deleted) {
      throw new Error('Visit not found')
    }

    return { success: true }
  })
