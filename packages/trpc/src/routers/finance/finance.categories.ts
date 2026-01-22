import { getSpendingCategories } from '@hominem/finance-services';
import { protectedProcedure, router } from '../../procedures';

// Export tRPC router
export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getSpendingCategories(ctx.userId);
  }),
});
