import { getPlaceByGoogleMapsId, isGooglePhotosUrl, upsertPlace } from '@hominem/data/places';
import { z } from 'zod';
import { googlePlaces } from '@hominem/data/places';
import { transformGooglePlaceToPlaceInsert } from '~/lib/places-utils';
import { logger } from '../../logger';
import { protectedProcedure } from '../context';
import { enrichPlaceWithDetails } from './places.helpers';

export const getDetailsByGoogleId = protectedProcedure
  .input(z.object({ googleMapsId: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    const { googleMapsId } = input;
    try {
      let dbPlace = await getPlaceByGoogleMapsId(googleMapsId);

      if (!dbPlace) {
        const googlePlace = await googlePlaces.getDetails({
          placeId: input.googleMapsId,
          forceFresh: true,
        });

        if (!googlePlace) {
          throw new Error('Place not found in Google Places API');
        }

        const placeData = transformGooglePlaceToPlaceInsert(googlePlace, googleMapsId);

        dbPlace = await upsertPlace({ data: placeData });
      }

      // If photos are missing or raw refs, try to enrich in background
      try {
        const queues = ctx.queues;
        const hasGooglePhotos = dbPlace.photos?.some((url) => isGooglePhotosUrl(url));
        if (
          (dbPlace.photos == null || dbPlace.photos.length === 0 || hasGooglePhotos) &&
          dbPlace.googleMapsId
        ) {
          await queues.placePhotoEnrich.add('enrich', {
            placeId: dbPlace.id,
            forceFresh: true,
          });
        }
      } catch (err) {
        // Non-fatal, just log warning
        logger.warn('Failed to enqueue enrichment for place details', {
          error: err instanceof Error ? err.message : String(err),
          googleMapsId,
        });
      }

      return enrichPlaceWithDetails(ctx, dbPlace);
    } catch (error) {
      logger.error('Error fetching place details by Google ID', {
        error: error instanceof Error ? error.message : String(error),
        googleMapsId,
      });
      throw new Error('Failed to fetch place details');
    }
  });
