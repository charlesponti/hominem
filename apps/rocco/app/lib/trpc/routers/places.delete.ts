import { deletePlaceById } from '@hominem/places-services';
import { z } from 'zod';

import { protectedProcedure } from '../context';

export const remove = protectedProcedure
  .input(z.object({ id: z.uuid() }))
  .mutation(async ({ input }) => {
    const deleted = await deletePlaceById(input.id);

    if (!deleted) {
      throw new Error("Place not found or you don't have permission to delete it");
    }

    return { success: true };
  });
