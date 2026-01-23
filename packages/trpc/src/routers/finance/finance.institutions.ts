import {
  createInstitution,
  getAllInstitutions,
} from '@hominem/finance-services';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

export const institutionsRouter = router({
  // Get all available institutions
  list: protectedProcedure.query(async () => {
    return await getAllInstitutions();
  }),

  // Create a new institution (for manual accounts)
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Name is required'),
        url: z.string().url().optional(),
        logo: z.string().optional(),
        primaryColor: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createInstitution(input);
    }),
});
