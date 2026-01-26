import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  getVisitsByPlace,
  getVisitsByUser,
  updateEvent,
} from '@hominem/events-services';
import {
  addPlaceToLists,
  createOrUpdatePlace,
  deletePlaceById,
  getPlaceById,
  getPlaceByGoogleMapsId,
  getNearbyPlacesFromLists,
  googlePlaces,
  isGooglePhotosUrl,
  removePlaceFromList,
  type PlaceInsert,
} from '@hominem/places-services';
import { error, success, isServiceError } from '@hominem/services';
import { sanitizeStoredPhotos } from '@hominem/utils/images';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  placeCreateSchema,
  placeUpdateSchema,
  placeDeleteSchema,
  placeAutocompleteSchema,
  placeGetByIdSchema,
  placeGetByGoogleIdSchema,
  placeAddToListsSchema,
  placeRemoveFromListSchema,
  placeGetNearbySchema,
  placeLogVisitSchema,
  placeGetMyVisitsSchema,
  placeGetPlaceVisitsSchema,
  placeUpdateVisitSchema,
  placeDeleteVisitSchema,
  placeGetVisitStatsSchema,
  type PlaceCreateOutput,
  type PlaceUpdateOutput,
  type PlaceDeleteOutput,
  type PlaceAutocompleteOutput,
  type PlaceGetDetailsByIdOutput,
  type PlaceGetDetailsByGoogleIdOutput,
  type PlaceAddToListsOutput,
  type PlaceRemoveFromListOutput,
  type PlaceGetNearbyFromListsOutput,
  type PlaceLogVisitOutput,
  type PlaceGetMyVisitsOutput,
  type PlaceGetPlaceVisitsOutput,
  type PlaceUpdateVisitOutput,
  type PlaceDeleteVisitOutput,
  type PlaceGetVisitStatsOutput,
} from '../types/places.types';

/**
 * Serialize visit data with Date to string conversion
 */
function serializeVisit(visit: any): any {
  return {
    id: visit.id,
    title: visit.title,
    description: visit.description,
    date: visit.date instanceof Date ? visit.date.toISOString() : visit.date,
    placeId: visit.placeId,
    visitNotes: visit.visitNotes,
    visitRating: visit.visitRating,
    visitReview: visit.visitReview,
    tags: visit.tags,
    people: visit.people,
    userId: visit.userId,
    createdAt: visit.createdAt instanceof Date ? visit.createdAt.toISOString() : visit.createdAt,
    updatedAt: visit.updatedAt instanceof Date ? visit.updatedAt.toISOString() : visit.updatedAt,
  };
}

/**
 * Serialize visit from service response (may have nested event object)
 */
function serializeVisitFromService(data: any): any {
  const event = data.event || data;
  return serializeVisit(event);
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractPhotoReferences(photos: any[]): string[] {
  if (!photos || !Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === 'string') return photo;
      if (photo?.name)
        return `https://places.googleapis.com/v1/${photo.name}/media?key=${process.env.GOOGLE_PLACES_API_KEY}&maxHeightPx=1600&maxWidthPx=1600`;
      return null;
    })
    .filter((url): url is string => url !== null);
}

function mapGooglePlaceToPrediction(place: any) {
  return {
    place_id: place.id,
    text: place.displayName?.text || '',
    address: place.formattedAddress,
    location: place.location
      ? {
          latitude: place.location.latitude,
          longitude: place.location.longitude,
        }
      : null,
  };
}

// ============================================================================
// Routes
// ============================================================================

export const placesRoutes = new Hono<AppContext>()
  // Create new place
  .post('/create', authMiddleware, zValidator('json', placeCreateSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeCreateSchema>;
      const userId = c.get('userId')!;
      const queues = c.get('queues');

      const { listIds, ...placeInput } = input;

      // Fetch Google Place details if needed
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
            const rawPhotos = extractPhotoReferences(googlePlaceData.photos ?? []);
            fetchedPhotos = sanitizeStoredPhotos(rawPhotos);
            fetchedImageUrl = fetchedPhotos.length > 0 ? fetchedPhotos[0]! : null;

            fetchedRating = googlePlaceData.rating ?? null;
            fetchedTypes = googlePlaceData.types ?? null;
            fetchedAddress = googlePlaceData.formattedAddress ?? null;
            fetchedLatitude = googlePlaceData.location?.latitude ?? null;
            fetchedLongitude = googlePlaceData.location?.longitude ?? null;
            fetchedWebsiteUri = googlePlaceData.websiteUri ?? null;
            fetchedPhoneNumber = googlePlaceData.nationalPhoneNumber ?? null;
          }
        } catch (err) {
          console.error('[places.create] Failed to fetch Google details:', err);
        }
      }

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
          placeInput.types && placeInput.types.length > 0
            ? placeInput.types
            : (fetchedTypes ?? null),
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

      const { place: createdPlace } = await addPlaceToLists(userId, listIds ?? [], placeData);

      // Enqueue photo enrichment if needed
      try {
        if (queues) {
          const hasGooglePhotos = createdPlace.photos?.some((url: string) => isGooglePhotosUrl(url));
          if (
            (createdPlace.photos == null || createdPlace.photos.length === 0 || hasGooglePhotos) &&
            createdPlace.googleMapsId
          ) {
            await queues.placePhotoEnrich.add('enrich', {
              placeId: createdPlace.id,
              forceFresh: true,
            });
          }
        }
      } catch (err) {
        console.warn('[places.create] Failed to enqueue photo enrichment:', err);
      }

      return c.json<PlaceCreateOutput>(success(createdPlace as any), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceCreateOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.create] unexpected error:', err);
      return c.json<PlaceCreateOutput>(error('INTERNAL_ERROR', 'Failed to create place'), 500);
    }
  })

  // Update place
  .post('/update', authMiddleware, zValidator('json', placeUpdateSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeUpdateSchema>;

      const updatedPlace = await createOrUpdatePlace(input.id, input);

      if (!updatedPlace) {
        return c.json<PlaceUpdateOutput>(error('NOT_FOUND', 'Place not found'), 404);
      }

      return c.json<PlaceUpdateOutput>(success(updatedPlace as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceUpdateOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.update] unexpected error:', err);
      return c.json<PlaceUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update place'), 500);
    }
  })

  // Delete place
  .post('/delete', authMiddleware, zValidator('json', placeDeleteSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeDeleteSchema>;

      const success_ = await deletePlaceById(input.id);

      if (!success_) {
        return c.json<PlaceDeleteOutput>(error('NOT_FOUND', 'Place not found'), 404);
      }

      return c.json<PlaceDeleteOutput>(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceDeleteOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.delete] unexpected error:', err);
      return c.json<PlaceDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete place'), 500);
    }
  })

  // Autocomplete places
  .post('/autocomplete', authMiddleware, zValidator('json', placeAutocompleteSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeAutocompleteSchema>;

      const query = input.query.trim();
      if (query.length < 2) {
        return c.json<PlaceAutocompleteOutput>(success([]), 200);
      }

      const locationBias =
        typeof input.location?.lat === 'number' && typeof input.location?.lng === 'number'
          ? {
              latitude: input.location.lat,
              longitude: input.location.lng,
              radius: input.radius ?? 50000,
            }
          : undefined;

      const places = await googlePlaces.search({
        query: query,
        locationBias: locationBias,
      });

      const predictions = places.map(mapGooglePlaceToPrediction);
      return c.json<PlaceAutocompleteOutput>(success(predictions), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceAutocompleteOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.autocomplete] unexpected error:', err);
      return c.json<PlaceAutocompleteOutput>(error('INTERNAL_ERROR', 'Failed to fetch autocomplete suggestions'), 500);
    }
  })

  // Get place details by ID
  .post('/get', authMiddleware, zValidator('json', placeGetByIdSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetByIdSchema>;
      const queues = c.get('queues');

      const dbPlace = await getPlaceById(input.id);

      if (!dbPlace) {
        return c.json<PlaceGetDetailsByIdOutput>(error('NOT_FOUND', 'Place not found'), 404);
      }

      // Enqueue photo enrichment if needed
      try {
        if (queues) {
          const hasGooglePhotos = dbPlace.photos?.some((url: string) => isGooglePhotosUrl(url));
          if (
            (dbPlace.photos == null || dbPlace.photos.length === 0 || hasGooglePhotos) &&
            dbPlace.googleMapsId
          ) {
            await queues.placePhotoEnrich.add('enrich', {
              placeId: dbPlace.id,
              forceFresh: true,
            });
          }
        }
      } catch {
        // Non-fatal
      }

      return c.json<PlaceGetDetailsByIdOutput>(success(dbPlace as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceGetDetailsByIdOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.get] unexpected error:', err);
      return c.json<PlaceGetDetailsByIdOutput>(error('INTERNAL_ERROR', 'Failed to fetch place'), 500);
    }
  })

  // Get place by Google Maps ID
  .post(
    '/get-by-google-id',
    authMiddleware,
    zValidator('json', placeGetByGoogleIdSchema),
    async (c) => {
      try {
        const input = c.req.valid('json') as z.infer<typeof placeGetByGoogleIdSchema>;

        const place = await getPlaceByGoogleMapsId(input.googleMapsId);

        return c.json<PlaceGetDetailsByGoogleIdOutput>(success(place as any || null), 200);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json<PlaceGetDetailsByGoogleIdOutput>(error(err.code, err.message, err.details), err.statusCode as any);
        }

        console.error('[places.get-by-google-id] unexpected error:', err);
        return c.json<PlaceGetDetailsByGoogleIdOutput>(error('INTERNAL_ERROR', 'Failed to fetch place'), 500);
      }
    },
  )

  // Add place to lists
  .post('/add-to-lists', authMiddleware, zValidator('json', placeAddToListsSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeAddToListsSchema>;

      return c.json<PlaceAddToListsOutput>(
        success({
          success: true,
          addedToLists: input.listIds.length,
        }),
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceAddToListsOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.add-to-lists] unexpected error:', err);
      return c.json<PlaceAddToListsOutput>(error('INTERNAL_ERROR', 'Failed to add place to lists'), 500);
    }
  })

  // Remove place from list
  .post(
    '/remove-from-list',
    authMiddleware,
    zValidator('json', placeRemoveFromListSchema),
    async (c) => {
      try {
        const input = c.req.valid('json') as z.infer<typeof placeRemoveFromListSchema>;
        const userId = c.get('userId')!;

        await removePlaceFromList({
          placeIdentifier: input.placeId,
          listId: input.listId,
          userId,
        });

        return c.json<PlaceRemoveFromListOutput>(success({ success: true }), 200);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json<PlaceRemoveFromListOutput>(error(err.code, err.message, err.details), err.statusCode as any);
        }

        console.error('[places.remove-from-list] unexpected error:', err);
        return c.json<PlaceRemoveFromListOutput>(error('INTERNAL_ERROR', 'Failed to remove place from list'), 500);
      }
    },
  )

  // Get nearby places from user's lists
  .post('/nearby', authMiddleware, zValidator('json', placeGetNearbySchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetNearbySchema>;
      const userId = c.get('userId')!;

      const places = await getNearbyPlacesFromLists({
        userId,
        latitude: input.location.lat,
        longitude: input.location.lng,
        radiusKm: input.radius ? input.radius / 1000 : 50,
        limit: input.limit ?? 20,
      });

      return c.json<PlaceGetNearbyFromListsOutput>(success(places as any), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceGetNearbyFromListsOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.nearby] unexpected error:', err);
      return c.json<PlaceGetNearbyFromListsOutput>(error('INTERNAL_ERROR', 'Failed to fetch nearby places'), 500);
    }
  })

  // Log visit to a place
  .post('/log-visit', authMiddleware, zValidator('json', placeLogVisitSchema), async (c) => {
    try {
      const data = c.req.valid('json') as z.infer<typeof placeLogVisitSchema>;
      const userId = c.get('userId')!;

      const dateValue = data.date ? new Date(data.date) : new Date();

      const event = await createEvent({
        title: (data.title ?? '') as string,
        description: data.description ?? null,
        date: dateValue,
        type: 'Events',
        placeId: data.placeId,
        visitNotes: data.visitNotes ?? null,
        visitRating: data.visitRating ?? null,
        visitReview: data.visitReview ?? null,
        userId: userId,
        tags: data.tags,
        people: data.people,
      });

      return c.json<PlaceLogVisitOutput>(success(serializeVisit(event)), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceLogVisitOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.log-visit] unexpected error:', err);
      return c.json<PlaceLogVisitOutput>(error('INTERNAL_ERROR', 'Failed to log visit'), 500);
    }
  })

  // Get user's visits
  .post('/my-visits', authMiddleware, zValidator('json', placeGetMyVisitsSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetMyVisitsSchema>;
      const userId = c.get('userId')!;

      const visits = await getVisitsByUser(userId);

      return c.json<PlaceGetMyVisitsOutput>(success(visits.map(serializeVisitFromService)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceGetMyVisitsOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.my-visits] unexpected error:', err);
      return c.json<PlaceGetMyVisitsOutput>(error('INTERNAL_ERROR', 'Failed to fetch visits'), 500);
    }
  })

  // Get visits for a specific place
  .post(
    '/place-visits',
    authMiddleware,
    zValidator('json', placeGetPlaceVisitsSchema),
    async (c) => {
      try {
        const input = c.req.valid('json') as z.infer<typeof placeGetPlaceVisitsSchema>;

        const visits = await getVisitsByPlace(input.placeId);

        return c.json<PlaceGetPlaceVisitsOutput>(success(visits.map(serializeVisitFromService)), 200);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json<PlaceGetPlaceVisitsOutput>(error(err.code, err.message, err.details), err.statusCode as any);
        }

        console.error('[places.place-visits] unexpected error:', err);
        return c.json<PlaceGetPlaceVisitsOutput>(error('INTERNAL_ERROR', 'Failed to fetch place visits'), 500);
      }
    },
  )

  // Update visit
  .post('/update-visit', authMiddleware, zValidator('json', placeUpdateVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeUpdateVisitSchema>;

      const { id, date, ...updateData } = input;

      const updatedEvent = await updateEvent(id, updateData as any);

      if (!updatedEvent) {
        return c.json<PlaceUpdateVisitOutput>(error('NOT_FOUND', 'Visit not found'), 404);
      }

      return c.json<PlaceUpdateVisitOutput>(success(serializeVisit(updatedEvent)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceUpdateVisitOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.update-visit] unexpected error:', err);
      return c.json<PlaceUpdateVisitOutput>(error('INTERNAL_ERROR', 'Failed to update visit'), 500);
    }
  })

  // Delete visit
  .post('/delete-visit', authMiddleware, zValidator('json', placeDeleteVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeDeleteVisitSchema>;

      const success_ = await deleteEvent(input.id);

      if (!success_) {
        return c.json<PlaceDeleteVisitOutput>(error('NOT_FOUND', 'Visit not found'), 404);
      }

      return c.json<PlaceDeleteVisitOutput>(success({ success: true }), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceDeleteVisitOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.delete-visit] unexpected error:', err);
      return c.json<PlaceDeleteVisitOutput>(error('INTERNAL_ERROR', 'Failed to delete visit'), 500);
    }
  })

  // Get visit statistics for a place
  .post('/visit-stats', authMiddleware, zValidator('json', placeGetVisitStatsSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetVisitStatsSchema>;

      const visits = await getVisitsByPlace(input.placeId as string);

      // Calculate stats
      const totalVisits = visits.length;
      const normalizedVisits = visits.map((v: any) => v.event || v);
      const ratings = normalizedVisits
        .filter((v: any) => v.visitRating)
        .map((v: any) => v.visitRating as number);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
          : undefined;

      const sortedVisits = normalizedVisits.sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      const lastVisitDate = sortedVisits[0]?.date;
      const firstVisitDate = sortedVisits[sortedVisits.length - 1]?.date;

      const lastVisit = lastVisitDate
        ? lastVisitDate instanceof Date
          ? lastVisitDate.toISOString()
          : lastVisitDate
        : undefined;
      const firstVisit = firstVisitDate
        ? firstVisitDate instanceof Date
          ? firstVisitDate.toISOString()
          : firstVisitDate
        : undefined;

      // Count tags and people
      const tagCounts = new Map<string, number>();
      const peopleCounts = new Map<string, number>();

      visits.forEach((visit: any) => {
        visit.tags?.forEach((tag: any) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
        visit.people?.forEach((person: any) => {
          peopleCounts.set(person, (peopleCounts.get(person) || 0) + 1);
        });
      });

      const result = {
        totalVisits,
        averageRating,
        lastVisit,
        firstVisit,
        tags: Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count),
        people: Array.from(peopleCounts.entries())
          .map(([person, count]) => ({ person, count }))
          .sort((a, b) => b.count - a.count),
      };

      return c.json<PlaceGetVisitStatsOutput>(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<PlaceGetVisitStatsOutput>(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[places.visit-stats] unexpected error:', err);
      return c.json<PlaceGetVisitStatsOutput>(error('INTERNAL_ERROR', 'Failed to fetch visit statistics'), 500);
    }
  });
