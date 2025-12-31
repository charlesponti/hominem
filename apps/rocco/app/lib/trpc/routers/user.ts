import { protectedProcedure, router } from '../context'

export const userRouter = router({
  deleteAccount: protectedProcedure.mutation(async () => {
    // TODO: Implement account deletion logic
    // This would typically involve deleting all user data
    // For now, just return success
    return { success: true }
  }),
})
