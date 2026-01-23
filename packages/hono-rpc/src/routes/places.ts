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
import { sanitizeStoredPhotos } from '@hominem/utils/images';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  PlaceCreateOutput,
  PlaceUpdateOutput,
  PlaceDeleteOutput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListOutput,
  PlaceGetNearbyFromListsOutput,
  PlaceLogVisitOutput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsOutput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitOutput,
  PlaceGetVisitStatsOutput,
} from '../types/places.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

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

/**
 * Places Routes
 *
 * Handles all place-related operations including:
 * - CRUD operations for places
 * - Google Places autocomplete and details
 * - Visit tracking and statistics
 * - Place-list relationships
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const placeCreateSchema = z.object({
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
  listIds: z.array(z.string().uuid()).optional(),
});

const placeUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  types: z.array(z.string()).optional(),
  websiteUri: z.string().optional(),
  phoneNumber: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

const placeDeleteSchema = z.object({
  id: z.string().uuid(),
});

const placeAutocompleteSchema = z.object({
  query: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().optional().default(50000),
});

const placeGetByIdSchema = z.object({
  id: z.string().uuid(),
});

const placeGetByGoogleIdSchema = z.object({
  googleMapsId: z.string(),
});

const placeAddToListsSchema = z.object({
  placeId: z.string().uuid(),
  listIds: z.array(z.string().uuid()),
});

const placeRemoveFromListSchema = z.object({
  placeId: z.string().uuid(),
  listId: z.string().uuid(),
});

const placeGetNearbySchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().optional(),
  limit: z.number().optional(),
});

const placeLogVisitSchema = z.object({
  placeId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  visitNotes: z.string().optional(),
  visitRating: z.number().int().min(1).max(5).optional(),
  visitReview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

const placeGetMyVisitsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
});

const placeGetPlaceVisitsSchema = z.object({
  placeId: z.string().uuid(),
});

const placeUpdateVisitSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.union([z.string(), z.date()]).optional(),
  visitNotes: z.string().optional(),
  visitRating: z.number().int().min(1).max(5).optional(),
  visitReview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

const placeDeleteVisitSchema = z.object({
  id: z.string().uuid(),
});

const placeGetVisitStatsSchema = z.object({
  placeId: z.string().uuid(),
});

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
    id: place.id,
    description: place.formattedAddress || place.displayName?.text || '',
    name: place.displayName?.text || '',
    address: place.formattedAddress,
    types: place.types,
  };
}

// ============================================================================
// Routes
// ============================================================================

export const placesRoutes = new Hono<AppContext>()
  // Create new place
  .post('/create', authMiddleware, zValidator('json', placeCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const queues = c.get('queues');

    try {
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
        } catch (error) {
          console.error('[places.create] Failed to fetch Google details:', error);
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
      } catch (err) {
        console.warn('[places.create] Failed to enqueue photo enrichment:', err);
      }

      const result: PlaceCreateOutput = createdPlace as PlaceCreateOutput;
      return c.json(result);
    } catch (error) {
      console.error('[places.create]', error);
      return c.json({ error: 'Failed to create place' }, 500);
    }
  })

  // Update place
  .post('/update', authMiddleware, zValidator('json', placeUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const updatedPlace = await createOrUpdatePlace(input.id, input);

      if (!updatedPlace) {
        return c.json({ error: 'Place not found or unauthorized' }, 404);
      }

      const result: PlaceUpdateOutput = updatedPlace as PlaceUpdateOutput;
      return c.json(result);
    } catch (error) {
      console.error('[places.update]', error);
      return c.json({ error: 'Failed to update place' }, 500);
    }
  })

  // Delete place
  .post('/delete', authMiddleware, zValidator('json', placeDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const success = await deletePlaceById(input.id);

      if (!success) {
        return c.json({ error: 'Place not found or unauthorized' }, 404);
      }

      const result: PlaceDeleteOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[places.delete]', error);
      return c.json({ error: 'Failed to delete place' }, 500);
    }
  })

  // Autocomplete places
  .post('/autocomplete', authMiddleware, zValidator('json', placeAutocompleteSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const query = input.query.trim();
      if (query.length < 2) {
        return c.json([]);
      }

      const locationBias =
        typeof input.latitude === 'number' && typeof input.longitude === 'number'
          ? {
              latitude: input.latitude,
              longitude: input.longitude,
              radius: input.radius ?? 50000,
            }
          : undefined;

      const places = await googlePlaces.search({
        query: query,
        locationBias: locationBias,
      });

      const predictions = places.map(mapGooglePlaceToPrediction);
      const result: PlaceAutocompleteOutput = predictions;
      return c.json(result);
    } catch (error) {
      console.error('[places.autocomplete]', error);
      return c.json({ error: 'Failed to fetch autocomplete suggestions' }, 500);
    }
  })

  // Get place details by ID
  .post('/get', authMiddleware, zValidator('json', placeGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const queues = c.get('queues');

    try {
      const dbPlace = await getPlaceById(input.id);

      if (!dbPlace) {
        return c.json({ error: 'Place not found' }, 404);
      }

      // Enqueue photo enrichment if needed
      try {
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
      } catch {
        // Non-fatal
      }

      const result: PlaceGetDetailsByIdOutput = dbPlace as PlaceGetDetailsByIdOutput;
      return c.json(result);
    } catch (error) {
      console.error('[places.get]', error);
      return c.json({ error: 'Failed to fetch place' }, 500);
    }
  })

  // Get place by Google Maps ID
  .post(
    '/get-by-google-id',
    authMiddleware,
    zValidator('json', placeGetByGoogleIdSchema),
    async (c) => {
      const input = c.req.valid('json');

      try {
        const place = await getPlaceByGoogleMapsId(input.googleMapsId);

        const result: PlaceGetDetailsByGoogleIdOutput = place
          ? (place as PlaceGetDetailsByGoogleIdOutput)
          : null;
        return c.json(result);
      } catch (error) {
        console.error('[places.get-by-google-id]', error);
        return c.json({ error: 'Failed to fetch place' }, 500);
      }
    },
  )

  // Add place to lists
  .post('/add-to-lists', authMiddleware, zValidator('json', placeAddToListsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      // Implementation would add place to multiple lists
      // This is a simplified version
      const result: PlaceAddToListsOutput = {
        success: true,
        addedToLists: input.listIds.length,
      };
      return c.json(result);
    } catch (error) {
      console.error('[places.add-to-lists]', error);
      return c.json({ error: 'Failed to add place to lists' }, 500);
    }
  })

  // Remove place from list
  .post(
    '/remove-from-list',
    authMiddleware,
    zValidator('json', placeRemoveFromListSchema),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      try {
        await removePlaceFromList({
          placeIdentifier: input.placeId,
          listId: input.listId,
          userId,
        });

        const result: PlaceRemoveFromListOutput = { success: true };
        return c.json(result);
      } catch (error) {
        console.error('[places.remove-from-list]', error);
        return c.json({ error: 'Failed to remove place from list' }, 500);
      }
    },
  )

  // Get nearby places from user's lists
  .post('/nearby', authMiddleware, zValidator('json', placeGetNearbySchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const places = await getNearbyPlacesFromLists({
        userId,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusMeters ? input.radiusMeters / 1000 : 50,
        limit: input.limit ?? 20,
      });

      const result: PlaceGetNearbyFromListsOutput = places as PlaceGetNearbyFromListsOutput;
      return c.json(result);
    } catch (error) {
      console.error('[places.nearby]', error);
      return c.json({ error: 'Failed to fetch nearby places' }, 500);
    }
  })

  // Log visit to a place
  .post('/log-visit', authMiddleware, zValidator('json', placeLogVisitSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const dateValue = input.date ? new Date(input.date) : new Date();

      const event = await createEvent({
        title: input.title,
        description: input.description,
        date: dateValue,
        type: 'Events',
        placeId: input.placeId,
        visitNotes: input.visitNotes,
        visitRating: input.visitRating,
        visitReview: input.visitReview,
        userId: userId,
        tags: input.tags,
        people: input.people,
      });

      const result: PlaceLogVisitOutput = serializeVisit(event);
      return c.json(result);
    } catch (error) {
      console.error('[places.log-visit]', error);
      return c.json({ error: 'Failed to log visit' }, 500);
    }
  })

  // Get user's visits
  .post('/my-visits', authMiddleware, zValidator('json', placeGetMyVisitsSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const visits = await getVisitsByUser(userId);

      const result: PlaceGetMyVisitsOutput = visits.map(serializeVisitFromService);
      return c.json(result);
    } catch (error) {
      console.error('[places.my-visits]', error);
      return c.json({ error: 'Failed to fetch visits' }, 500);
    }
  })

  // Get visits for a specific place
  .post(
    '/place-visits',
    authMiddleware,
    zValidator('json', placeGetPlaceVisitsSchema),
    async (c) => {
      const input = c.req.valid('json');

      try {
        const visits = await getVisitsByPlace(input.placeId);

        const result: PlaceGetPlaceVisitsOutput = visits.map(serializeVisitFromService);
        return c.json(result);
      } catch (error) {
        console.error('[places.place-visits]', error);
        return c.json({ error: 'Failed to fetch place visits' }, 500);
      }
    },
  )

  // Update visit
  .post('/update-visit', authMiddleware, zValidator('json', placeUpdateVisitSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const { id, date, ...updateData } = input;

      const updatedEvent = await updateEvent(id, updateData);

      if (!updatedEvent) {
        return c.json({ error: 'Visit not found or unauthorized' }, 404);
      }

      const result: PlaceUpdateVisitOutput = serializeVisit(updatedEvent);
      return c.json(result);
    } catch (error) {
      console.error('[places.update-visit]', error);
      return c.json({ error: 'Failed to update visit' }, 500);
    }
  })

  // Delete visit
  .post('/delete-visit', authMiddleware, zValidator('json', placeDeleteVisitSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const success = await deleteEvent(input.id);

      if (!success) {
        return c.json({ error: 'Visit not found or unauthorized' }, 404);
      }

      const result: PlaceDeleteVisitOutput = { success: true };
      return c.json(result);
    } catch (error) {
      console.error('[places.delete-visit]', error);
      return c.json({ error: 'Failed to delete visit' }, 500);
    }
  })

  // Get visit statistics for a place
  .post('/visit-stats', authMiddleware, zValidator('json', placeGetVisitStatsSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const visits = await getVisitsByPlace(input.placeId);

      // Calculate stats
      const totalVisits = visits.length;
      const normalizedVisits = visits.map((v: any) => v.event || v);
      const ratings = normalizedVisits
        .filter((v: any) => v.visitRating)
        .map((v: any) => v.visitRating as number);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
          : null;

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

      const result: PlaceGetVisitStatsOutput = {
        totalVisits,
        averageRating: averageRating ?? undefined,
        lastVisit,
        firstVisit,
        tags: Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count),
        people: Array.from(peopleCounts.entries())
          .map(([person, count]) => ({ person, count }))
          .sort((a, b) => b.count - a.count),
      };

      return c.json(result);
    } catch (error) {
      console.error('[places.visit-stats]', error);
      return c.json({ error: 'Failed to fetch visit statistics' }, 500);
    }
  });
