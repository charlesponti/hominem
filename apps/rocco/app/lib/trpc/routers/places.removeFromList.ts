import { removePlaceFromList } from '@hominem/places-services';
import * as z from 'zod';

import { protectedProcedure } from '../context';

export const removeFromList = protectedProcedure
  .input(
    z.object({
      listId: z.uuid(),
      placeId: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { listId, placeId: googleMapsIdOrDbId } = input;

    try {
      const removed = await removePlaceFromList({
        listId,
        placeIdentifier: googleMapsIdOrDbId,
        userId: ctx.user.id,
      });

      if (!removed) {
        throw new Error(
          'Place not found in this list, or you do not have permission to remove it.',
        );
      }

      return { message: 'Place removed from list successfully' };
    } catch {
      throw new Error('Failed to delete place from list');
    }
  });
