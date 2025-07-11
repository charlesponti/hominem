import { deleteAllFinanceData } from '@hominem/utils/finance'
import { protectedProcedure, router } from '../../index.js'

// Data management tRPC router
export const dataRouter = router({
  // Delete all finance data for the authenticated user
  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAllFinanceData(ctx.userId)
    return { success: true, message: 'All finance data deleted' }
  }),
})
