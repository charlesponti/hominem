import { getVisitStatsByPlace } from '@hominem/events-services';
import * as z from 'zod';

import { protectedProcedure } from '../context';

export const getVisitStats = protectedProcedure
  .input(z.object({ placeId: z.uuid() }))
  .query(async ({ ctx, input }) => {
    return getVisitStatsByPlace(input.placeId, ctx.user.id);
  });
