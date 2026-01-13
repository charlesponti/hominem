import { getPlaceByGoogleMapsId, upsertPlace } from '@hominem/data/places';
import { buildPhotoMediaUrl } from '@hominem/utils/google';
import { z } from 'zod';
import { getPlaceDetails as fetchGooglePlaceDetails } from '~/lib/google-places.server';
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
        const googlePlace = await fetchGooglePlaceDetails({
          placeId: googleMapsId,
        });

        if (!googlePlace) {
          throw new Error('Place not found in Google Places API');
        }

        const placeData = transformGooglePlaceToPlaceInsert(googlePlace, googleMapsId);

        // Helper function to build photo media URL with API key
        const buildPhotoUrl = (photoRef: string) => {
          return buildPhotoMediaUrl({
            key: import.meta.env.GOOGLE_PLACES_API_KEY,
            pathname: photoRef,
          });
        };

        dbPlace = await upsertPlace({ data: placeData, buildPhotoMediaUrl: buildPhotoUrl });
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
