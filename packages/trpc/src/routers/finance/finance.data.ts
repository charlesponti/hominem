import { deleteAllFinanceData } from '@hominem/finance-services';

import { protectedProcedure, router } from '../../procedures';

// Data management tRPC router
export const dataRouter = router({
  // Delete all finance data for the authenticated user
  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAllFinanceData(ctx.userId);
    return { success: true, message: 'All finance data deleted' };
  }),
});
