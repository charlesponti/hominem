import { getVisitsByPlace } from '@hominem/events-services';
import * as z from 'zod';

import { protectedProcedure } from '../context';

export const getPlaceVisits = protectedProcedure
  .input(z.object({ placeId: z.uuid() }))
  .query(async ({ ctx, input }) => {
    return getVisitsByPlace(input.placeId, ctx.user.id);
  });
