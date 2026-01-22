import { getPlaceById, isGooglePhotosUrl } from '@hominem/places-services';
import { logger } from '@hominem/utils/logger';
import * as z from 'zod';

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
      const hasGooglePhotos = dbPlace.photos?.some((url) => isGooglePhotosUrl(url));
      if (
        (dbPlace.photos == null || dbPlace.photos.length === 0 || hasGooglePhotos) &&
        dbPlace.googleMapsId
      ) {
        logger.debug('Enqueueing photo enrich for place', {
          placeId: dbPlace.id,
          googleMapsId: dbPlace.googleMapsId,
        });
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
