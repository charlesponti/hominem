import { protectedProcedure, router } from '../context'

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not found in context')
    }

    return ctx.user
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('User not found in context')
    }

    // TODO: Implement account deletion logic
    // This would typically involve deleting all user data
    // For now, just return success
    return { success: true }
  }),
})
