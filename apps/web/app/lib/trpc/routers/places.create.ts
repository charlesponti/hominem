import { addPlaceToLists, isGooglePhotosUrl, type PlaceInsert } from '@hominem/services/places';
import { z } from 'zod';
import { googlePlaces } from '@hominem/services/places';
import { sanitizeStoredPhotos } from '@hominem/utils/images';
import { extractPhotoReferences } from '~/lib/places-utils';
import { logger } from '../../logger';
import { protectedProcedure } from '../context';

export const create = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      imageUrl: z.string().optional(),
      googleMapsId: z.string(),
      rating: z.number().optional(),
      types: z.array(z.string()).optional(),
      websiteUri: z.string().optional(),
      phoneNumber: z.string().optional(),
      photos: z.array(z.string()).optional(),
      listIds: z.array(z.uuid()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { listIds, ...placeInput } = input;

    // Fetch Google Place details if photos/imageUrl are missing
    let fetchedPhotos: string[] | null = null;
    let fetchedImageUrl: string | null = null;
    let fetchedRating: number | null = null;
    let fetchedTypes: string[] | null = null;
    let fetchedAddress: string | null = null;
    let fetchedLatitude: number | null = null;
    let fetchedLongitude: number | null = null;
    let fetchedWebsiteUri: string | null = null;
    let fetchedPhoneNumber: string | null = null;

    const needsDetails =
      !placeInput.photos ||
      placeInput.photos.length === 0 ||
      !placeInput.imageUrl ||
      !placeInput.rating ||
      !placeInput.types ||
      placeInput.types.length === 0;

    if (needsDetails) {
      try {
        const googlePlaceData = await googlePlaces.getDetails({
          placeId: placeInput.googleMapsId,
          forceFresh: true,
        });

        if (googlePlaceData) {
          // Extract and sanitize photos
          const rawPhotos = extractPhotoReferences(googlePlaceData.photos);
          fetchedPhotos = sanitizeStoredPhotos(rawPhotos);
          fetchedImageUrl = fetchedPhotos.length > 0 && fetchedPhotos[0] ? fetchedPhotos[0] : null;

          // Use fetched data to fill in missing fields
          fetchedRating = googlePlaceData.rating ?? null;
          fetchedTypes = googlePlaceData.types ?? null;
          fetchedAddress = googlePlaceData.formattedAddress ?? null;
          fetchedLatitude = googlePlaceData.location?.latitude ?? null;
          fetchedLongitude = googlePlaceData.location?.longitude ?? null;
          fetchedWebsiteUri = googlePlaceData.websiteUri ?? null;
          fetchedPhoneNumber = googlePlaceData.nationalPhoneNumber ?? null;
        }
      } catch (error) {
        logger.error('Failed to fetch Google Place details during create', {
          error: error instanceof Error ? error.message : String(error),
          googleMapsId: placeInput.googleMapsId,
        });
        // Continue with provided data if fetch fails
      }
    }

    // Transform input to PlaceInsert format, using fetched data to fill gaps
    const placeData: PlaceInsert = {
      googleMapsId: placeInput.googleMapsId,
      name: placeInput.name,
      address: placeInput.address ?? fetchedAddress ?? null,
      latitude: placeInput.latitude ?? fetchedLatitude ?? null,
      longitude: placeInput.longitude ?? fetchedLongitude ?? null,
      location:
        placeInput.latitude && placeInput.longitude
          ? [placeInput.longitude, placeInput.latitude]
          : fetchedLatitude && fetchedLongitude
            ? [fetchedLongitude, fetchedLatitude]
            : [0, 0],
      types:
        placeInput.types && placeInput.types.length > 0 ? placeInput.types : (fetchedTypes ?? null),
      rating: placeInput.rating ?? fetchedRating ?? null,
      websiteUri: placeInput.websiteUri ?? fetchedWebsiteUri ?? null,
      phoneNumber: placeInput.phoneNumber ?? fetchedPhoneNumber ?? null,
      photos:
        placeInput.photos && placeInput.photos.length > 0
          ? sanitizeStoredPhotos(placeInput.photos)
          : (fetchedPhotos ?? null),
      imageUrl:
        placeInput.imageUrl ??
        (placeInput.photos && placeInput.photos.length > 0
          ? placeInput.photos[0]
          : (fetchedImageUrl ?? null)),
    };

    const { place: createdPlace } = await addPlaceToLists(ctx.user.id, listIds ?? [], placeData);

    // If there are no photos stored yet but we have a Google Maps ID, enqueue background enrichment
    try {
      const queues = ctx.queues;
      const hasGooglePhotos = createdPlace.photos?.some((url) => isGooglePhotosUrl(url));
      if (
        (createdPlace.photos == null || createdPlace.photos.length === 0 || hasGooglePhotos) &&
        createdPlace.googleMapsId
      ) {
        await queues.placePhotoEnrich.add('enrich', {
          placeId: createdPlace.id,
          forceFresh: true,
        });
      }
    } catch (err) {
      // Non-fatal: log but don't break the request
      logger.warn('Failed to enqueue place photo enrichment', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return createdPlace;
  });
