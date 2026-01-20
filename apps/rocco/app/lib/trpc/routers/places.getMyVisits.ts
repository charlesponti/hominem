import { getVisitsByUser } from '@hominem/events-services';
import { z } from 'zod';

import { protectedProcedure } from '../context';

export const getMyVisits = protectedProcedure
  .input(
    z
      .object({
        placeId: z.uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const filters = input
      ? {
          placeId: input.placeId,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        }
      : undefined;

    return getVisitsByUser(ctx.user.id, filters);
  });
