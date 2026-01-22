import { createPerson, getPeople, type PersonInput } from '@hominem/services';
import * as z from 'zod';

import { protectedProcedure, router } from '../context';

export const peopleRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getPeople({ userId: ctx.user.id })),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const personInput: PersonInput = {
        userId: ctx.user.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      };

      return createPerson(personInput);
    }),
});
