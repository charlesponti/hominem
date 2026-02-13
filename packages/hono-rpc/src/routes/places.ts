import type { EventTypeEnum } from '@hominem/db/types/calendar';

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
  type PlaceInput,
} from '@hominem/places-services';
import { NotFoundError, ValidationError, InternalError, isServiceError } from '@hominem/services';
import { sanitizeStoredPhotos } from '@hominem/utils/images';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

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
 * Transform place from service layer to API contract
 * Converts Date objects to ISO strings for API response
 */
function transformPlaceToApiFormat(place: any): any {
  return {
    ...place,
    createdAt: place.createdAt instanceof Date ? place.createdAt.toISOString() : place.createdAt,
    updatedAt: place.updatedAt instanceof Date ? place.updatedAt.toISOString() : place.updatedAt,
  };
}

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
  const fromPrediction = place.placePrediction ?? place;
  const structured = fromPrediction.structuredFormat;
  const textObj = fromPrediction.text;
  const text = textObj?.text || fromPrediction.displayName?.text || '';
  const address =
    structured?.secondaryText?.text ||
    fromPrediction.formattedAddress ||
    structured?.mainText?.text ||
    '';

  return {
    place_id: fromPrediction.placeId || fromPrediction.id,
    text,
    address,
    location: null,
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

      // Fetch Google PlaceOutput details if needed
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

      const placeData: PlaceInput = {
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
          const hasGooglePhotos = createdPlace.photos?.some((url: string) =>
            isGooglePhotosUrl(url),
          );
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

      return c.json<PlaceCreateOutput>(transformPlaceToApiFormat(createdPlace), 201);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.create] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Update place
  .post('/update', authMiddleware, zValidator('json', placeUpdateSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeUpdateSchema>;

      const updatedPlace = await createOrUpdatePlace(input.id, {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.address && { address: input.address }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.imageUrl && { imageUrl: input.imageUrl }),
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.priceLevel !== undefined && { priceLevel: input.priceLevel }),
        ...(input.photos && { photos: input.photos }),
        ...(input.types && { types: input.types }),
        ...(input.websiteUri && { websiteUri: input.websiteUri }),
        ...(input.phoneNumber && { phoneNumber: input.phoneNumber }),
      });

      if (!updatedPlace) {
        throw new NotFoundError('');
      }

      return c.json<PlaceUpdateOutput>(transformPlaceToApiFormat(updatedPlace), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.update] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Delete place
  .post('/delete', authMiddleware, zValidator('json', placeDeleteSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeDeleteSchema>;

      const success_ = await deletePlaceById(input.id);

      if (!success_) {
        throw new NotFoundError('');
      }

      return c.json<PlaceDeleteOutput>({ success: true }, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.delete] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Autocomplete places
  .post('/autocomplete', authMiddleware, zValidator('json', placeAutocompleteSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeAutocompleteSchema>;

      const query = input.query.trim();
      if (query.length < 2) {
        return c.json<PlaceAutocompleteOutput>([], 200);
      }

      const locationBias =
        typeof input.location?.lat === 'number' && typeof input.location?.lng === 'number'
          ? {
              latitude: input.location.lat,
              longitude: input.location.lng,
              radius: input.radius ?? 50000,
            }
          : undefined;

      const suggestions = await googlePlaces.autocomplete({
        input: query,
        ...(input.sessionToken ? { sessionToken: input.sessionToken } : {}),
        includeQueryPredictions: input.includeQueryPredictions ?? false,
        includedPrimaryTypes: input.types ?? [],
        ...(locationBias && { locationBias }),
      });

      const predictions = suggestions
        .map((suggestion) => suggestion.placePrediction)
        .filter(Boolean)
        .map(mapGooglePlaceToPrediction);
      return c.json<PlaceAutocompleteOutput>(predictions, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.autocomplete] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Get place details by ID
  .post('/get', authMiddleware, zValidator('json', placeGetByIdSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetByIdSchema>;
      const queues = c.get('queues');

      const dbPlace = await getPlaceById(input.id);

      if (!dbPlace) {
        throw new NotFoundError('');
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

      return c.json<PlaceGetDetailsByIdOutput>(transformPlaceToApiFormat(dbPlace), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.get] unexpected error:', err);
      throw new InternalError('');
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

        return c.json<PlaceGetDetailsByGoogleIdOutput>(
          place ? transformPlaceToApiFormat(place) : null,
          200,
        );
      } catch (err) {
        if (isServiceError(err)) {
          throw err;
        }

        console.error('[places.get-by-google-id] unexpected error:', err);
        throw new InternalError('');
      }
    },
  )

  // Add place to lists
  .post('/add-to-lists', authMiddleware, zValidator('json', placeAddToListsSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeAddToListsSchema>;

      return c.json<PlaceAddToListsOutput>(
        {
          success: true,
          addedToLists: input.listIds.length,
        },
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.add-to-lists] unexpected error:', err);
      throw new InternalError('');
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

        return c.json<PlaceRemoveFromListOutput>(null, 200);
      } catch (err) {
        if (isServiceError(err)) {
          throw err;
        }

        console.error('[places.remove-from-list] unexpected error:', err);
        throw new InternalError('');
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

      return c.json<PlaceGetNearbyFromListsOutput>(places.map(transformPlaceToApiFormat), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.nearby] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Log visit to a place
  .post('/log-visit', authMiddleware, zValidator('json', placeLogVisitSchema), async (c) => {
    try {
      const data = c.req.valid('json') as z.infer<typeof placeLogVisitSchema>;
      const userId = c.get('userId')!;

      const dateValue = data.date ? new Date(data.date) : new Date();

      const event = await createEvent({
        title: data.title ?? '',
        description: data.description ?? null,
        date: dateValue,
        dateStart: null,
        dateEnd: null,
        dateTime: null,
        type: 'Events' as EventTypeEnum,
        placeId: data.placeId ?? null,
        userId: userId,
        source: 'manual',
        externalId: null,
        calendarId: null,
        lastSyncedAt: null,
        syncError: null,
        visitNotes: data.visitNotes ?? null,
        visitRating: data.visitRating ?? null,
        visitReview: data.visitReview ?? null,
        visitPeople: null,
        interval: null,
        recurrenceRule: null,
        score: null,
        priority: null,
        reminderSettings: null,
        dependencies: null,
        resources: null,
        milestones: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        // Default values for new fields
        currentValue: 0,
        streakCount: 0,
        totalCompletions: 0,
        completedInstances: 0,
        isCompleted: false,
        isTemplate: false,
        status: 'active',
        // Nullable fields
        goalCategory: null,
        targetValue: null,
        unit: null,
        lastCompletedAt: null,
        expiresInDays: null,
        reminderTime: null,
        parentEventId: null,
        activityType: null,
        duration: null,
        caloriesBurned: null,
        nextOccurrence: null,
        ...(data.tags && { tags: data.tags }),
        ...(data.people && { people: data.people }),
      });

      return c.json<PlaceLogVisitOutput>(serializeVisit(event), 201);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.log-visit] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Get user's visits
  .post('/my-visits', authMiddleware, zValidator('json', placeGetMyVisitsSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetMyVisitsSchema>;
      const userId = c.get('userId')!;

      const visits = await getVisitsByUser(userId);

      return c.json<PlaceGetMyVisitsOutput>(visits.map(serializeVisitFromService), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.my-visits] unexpected error:', err);
      throw new InternalError('');
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

        return c.json<PlaceGetPlaceVisitsOutput>(visits.map(serializeVisitFromService), 200);
      } catch (err) {
        if (isServiceError(err)) {
          throw err;
        }

        console.error('[places.place-visits] unexpected error:', err);
        throw new InternalError('');
      }
    },
  )

  // Update visit
  .post('/update-visit', authMiddleware, zValidator('json', placeUpdateVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeUpdateVisitSchema>;

      const { id, date, ...rest } = input;

      // Filter out undefined values for exactOptionalPropertyTypes
      const updateData: Record<string, any> = {};
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const updatedEvent = await updateEvent(id, updateData);

      if (!updatedEvent) {
        throw new NotFoundError('');
      }

      return c.json<PlaceUpdateVisitOutput>(serializeVisit(updatedEvent), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.update-visit] unexpected error:', err);
      throw new InternalError('');
    }
  })

  // Delete visit
  .post('/delete-visit', authMiddleware, zValidator('json', placeDeleteVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeDeleteVisitSchema>;

      const success_ = await deleteEvent(input.id);

      if (!success_) {
        throw new NotFoundError('');
      }

      return c.json<PlaceDeleteVisitOutput>({ success: true }, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.delete-visit] unexpected error:', err);
      throw new InternalError('');
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
        ...(averageRating !== undefined && { averageRating }),
        lastVisit,
        firstVisit,
        tags: Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count),
        people: Array.from(peopleCounts.entries())
          .map(([person, count]) => ({ person, count }))
          .sort((a, b) => b.count - a.count),
      };

      return c.json<PlaceGetVisitStatsOutput>(result, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      console.error('[places.visit-stats] unexpected error:', err);
      throw new InternalError('');
    }
  });
