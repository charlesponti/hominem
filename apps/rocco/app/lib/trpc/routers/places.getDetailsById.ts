import { getPlaceById } from '@hominem/data/places';
import { z } from 'zod';
import { protectedProcedure } from '../context';
import { enrichPlaceWithDetails } from './places.helpers';

export const getDetailsById = protectedProcedure
  .input(z.object({ id: z.uuid() }))
  .query(async ({ input, ctx }) => {
    const { id } = input;
    const dbPlace = await getPlaceById(id);

    if (!dbPlace) {
      throw new Error('Place not found');
    }

    const enriched = await enrichPlaceWithDetails(ctx, dbPlace);

    // If there are no stored photos but we fetched photos for display, enqueue background enrichment
    try {
      const queues = ctx.queues;
      if ((dbPlace.photos == null || dbPlace.photos.length === 0) && dbPlace.googleMapsId) {
        await queues.placePhotoEnrich.add('enrich', {
          placeId: dbPlace.id,
          forceFresh: true,
        });
      }
    } catch {
      // Non-fatal
    }

    return enriched;
  });
