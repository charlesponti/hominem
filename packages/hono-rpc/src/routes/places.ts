import {
  createVisit,
  deleteVisit,
  getVisitsByPlace,
  getVisitsByUser,
  type VisitWithPlaceAndTags,
  updateVisit,
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
import { NotFoundError, InternalError, isServiceError } from '../errors';
import { placePhotoEnrichQueue } from '@hominem/queues';
import { logger } from '@hominem/utils/logger';
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

type DistanceShape = number | { km?: number; miles?: number } | null | undefined;

type SerializablePlace = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  distance?: DistanceShape;
  lists?: PlaceGetNearbyFromListsOutput[number]['lists'];
};

type SerializedPlace =
  | PlaceCreateOutput
  | PlaceUpdateOutput
  | PlaceGetDetailsByIdOutput
  | PlaceGetDetailsByGoogleIdOutput
  | PlaceGetNearbyFromListsOutput[number];

type VisitTag = { id: string; name: string; color: string | null; description: string | null };
type VisitPerson = { id: string; firstName: string; lastName: string | null };
type VisitPlace = PlaceGetMyVisitsOutput[number]['place'];
type VisitUser = PlaceGetPlaceVisitsOutput[number]['user'];

type SerializableVisit = {
  id: string;
  title?: string | null;
  description?: string | null;
  date: string | Date | null;
  placeId?: string | null;
  visitNotes?: string | null;
  visitRating?: number | null;
  visitReview?: string | null;
  tags?: Array<string | VisitTag> | null;
  people?: Array<string | VisitPerson> | null;
  userId?: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  place?: VisitPlace | null;
  user?: VisitUser | null;
};

type SerializableVisitEnvelope = { event?: SerializableVisit };

type GooglePhotoInput = string | { name?: string | null };
type GoogleTextValue = { text?: string | null };
type GooglePlacePrediction = {
  placeId?: string | null;
  id?: string | null;
  structuredFormat?:
    | {
        mainText?: GoogleTextValue | null;
        secondaryText?: GoogleTextValue | null;
      }
    | null;
  text?: GoogleTextValue | null;
  displayName?: GoogleTextValue | null;
  formattedAddress?: string | null;
};
type GoogleSuggestion = GooglePlacePrediction | { placePrediction?: GooglePlacePrediction | null };

/**
 * Transform place from service layer to API contract
 * Converts Date objects to ISO strings for API response
 * Normalizes `distance` so the API always returns either `null` or an object of the form:
 *   { km: number, miles: number }
 * The service layer may sometimes return a plain number (meters) or an object with km/miles.
 * This function converts those shapes into a stable API contract.
 */
function transformPlaceToApiFormat(place: SerializablePlace): SerializedPlace {
  const rawDistance = place.distance;
  let distance: { km: number; miles: number } | null = null;

  if (rawDistance == null) {
    distance = null;
  } else if (typeof rawDistance === 'number' && Number.isFinite(rawDistance)) {
    // Service may provide distance in meters as a plain number — convert to km/miles
    distance = {
      km: rawDistance / 1000,
      miles: rawDistance / 1609.344,
    };
  } else if (typeof rawDistance === 'object') {
    const kmVal = rawDistance.km;
    const milesVal = rawDistance.miles;

    const hasKm = typeof kmVal === 'number' && Number.isFinite(kmVal);
    const hasMiles = typeof milesVal === 'number' && Number.isFinite(milesVal);

    if (hasKm && hasMiles) {
      distance = { km: kmVal, miles: milesVal };
    } else if (hasKm) {
      distance = { km: kmVal, miles: kmVal * 0.621371 };
    } else if (hasMiles) {
      distance = { km: milesVal / 0.621371, miles: milesVal };
    } else {
      distance = null;
    }
  } else {
    distance = null;
  }

  return {
    ...place,
    distance,
    createdAt: place.createdAt instanceof Date ? place.createdAt.toISOString() : place.createdAt,
    updatedAt: place.updatedAt instanceof Date ? place.updatedAt.toISOString() : place.updatedAt,
  };
}

function normalizeVisitTags(tags: SerializableVisit['tags']): string[] | null {
  if (!tags || tags.length === 0) {
    return null;
  }

  return tags.map((tag) => (typeof tag === 'string' ? tag : tag.name));
}

function normalizeVisitPeople(people: SerializableVisit['people']): string[] | null {
  if (!people || people.length === 0) {
    return null;
  }

  return people.map((person) =>
    typeof person === 'string' ? person : `${person.firstName}${person.lastName ? ` ${person.lastName}` : ''}`,
  );
}

/**
 * Serialize visit data with Date to string conversion
 */
function serializeVisit(visit: SerializableVisit): PlaceLogVisitOutput | PlaceUpdateVisitOutput {
  return {
    id: visit.id,
    title: visit.title ?? null,
    description: visit.description ?? null,
    date: visit.date instanceof Date ? visit.date.toISOString() : visit.date,
    placeId: visit.placeId ?? '',
    visitNotes: visit.visitNotes ?? null,
    visitRating: visit.visitRating ?? null,
    visitReview: visit.visitReview ?? null,
    tags: normalizeVisitTags(visit.tags),
    people: normalizeVisitPeople(visit.people),
    userId: visit.userId ?? '',
    createdAt:
      visit.createdAt instanceof Date
        ? visit.createdAt.toISOString()
        : (visit.createdAt ?? new Date(0).toISOString()),
    updatedAt:
      visit.updatedAt instanceof Date
        ? visit.updatedAt.toISOString()
        : (visit.updatedAt ?? new Date(0).toISOString()),
  };
}

/**
 * Serialize visit from service response (may have nested event object)
 */
function serializeVisitFromService(
  data: SerializableVisitEnvelope | SerializableVisit | VisitWithPlaceAndTags,
): PlaceGetMyVisitsOutput[number] | PlaceGetPlaceVisitsOutput[number] {
  const event = 'event' in data && data.event ? data.event : data;
  const serialized = serializeVisit(event);

  const place =
    'place' in event && event.place
      ? {
          id: event.place.id,
          name: event.place.name,
          address: event.place.address,
          latitude: event.place.latitude,
          longitude: event.place.longitude,
          imageUrl: event.place.imageUrl,
        }
      : undefined;

  const user = 'user' in event ? event.user : undefined;

  return {
    ...serialized,
    ...(place ? { place } : {}),
    ...(user ? { user } : {}),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractPhotoReferences(photos: GooglePhotoInput[]): string[] {
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

function mapGooglePlaceToPrediction(place: GoogleSuggestion) {
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

            fetchedRating = googlePlaceData.rating !== undefined ? googlePlaceData.rating : null;
            fetchedTypes = googlePlaceData.types ?? null;
            fetchedAddress = googlePlaceData.formattedAddress ?? null;
            fetchedLatitude = googlePlaceData.location?.latitude ?? null;
            fetchedLongitude = googlePlaceData.location?.longitude ?? null;
            fetchedWebsiteUri = googlePlaceData.websiteUri ?? null;
            fetchedPhoneNumber = googlePlaceData.nationalPhoneNumber ?? null;
          }
        } catch (err) {
          logger.error('[places.create] Failed to fetch Google details', { error: err });
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
            ? (placeInput.photos[0] ?? null)
            : (fetchedImageUrl ?? null)),
      };

      const { place: createdPlace } = await addPlaceToLists(userId, listIds ?? [], placeData);

      // Enqueue photo enrichment if needed
      try {
        const hasGooglePhotos = createdPlace.photos?.some((url: string) =>
          isGooglePhotosUrl(url),
        );
        if (
          (createdPlace.photos == null || createdPlace.photos.length === 0 || hasGooglePhotos) &&
          createdPlace.googleMapsId
        ) {
          await placePhotoEnrichQueue.add('enrich', {
            placeId: createdPlace.id,
            forceFresh: true,
          });
        }
      } catch (err) {
        logger.warn('[places.create] Failed to enqueue photo enrichment', { error: err });
      }

      return c.json<PlaceCreateOutput>(transformPlaceToApiFormat(createdPlace), 201);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.create] unexpected error:', { error: err });
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

      logger.error('[places.update] unexpected error:', { error: err });
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

      logger.error('[places.delete] unexpected error:', { error: err });
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
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map(mapGooglePlaceToPrediction);
      return c.json<PlaceAutocompleteOutput>(predictions, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.autocomplete] unexpected error:', { error: err });
      throw new InternalError('');
    }
  })

  // Get place details by ID
  .post('/get', authMiddleware, zValidator('json', placeGetByIdSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeGetByIdSchema>;

      const dbPlace = await getPlaceById(input.id);

      if (!dbPlace) {
        throw new NotFoundError('');
      }

      // Enqueue photo enrichment if needed
      try {
        const hasGooglePhotos = dbPlace.photos?.some((url: string) => isGooglePhotosUrl(url));
        if (
          (dbPlace.photos == null || dbPlace.photos.length === 0 || hasGooglePhotos) &&
          dbPlace.googleMapsId
        ) {
          await placePhotoEnrichQueue.add('enrich', {
            placeId: dbPlace.id,
            forceFresh: true,
          });
        }
      } catch {
        // Non-fatal
      }

      return c.json<PlaceGetDetailsByIdOutput>(transformPlaceToApiFormat(dbPlace), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.get] unexpected error:', { error: err });
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

        logger.error('[places.get-by-google-id] unexpected error:', { error: err });
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

      logger.error('[places.add-to-lists] unexpected error:', { error: err });
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
          placeId: input.placeId,
          listId: input.listId,
          userId,
        });

        return c.json<PlaceRemoveFromListOutput>(null, 200);
      } catch (err) {
        if (isServiceError(err)) {
          throw err;
        }

        logger.error('[places.remove-from-list] unexpected error:', { error: err });
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

      logger.error('[places.nearby] unexpected error:', { error: err });
      throw new InternalError('');
    }
  })

  // Log visit to a place
  .post('/log-visit', authMiddleware, zValidator('json', placeLogVisitSchema), async (c) => {
    try {
      const data = c.req.valid('json') as z.infer<typeof placeLogVisitSchema>;
      const userId = c.get('userId')!;

      const dateValue = data.date ? new Date(data.date) : new Date();

      const event = await createVisit({
        title: data.title ?? '',
        description: data.description ?? null,
        date: dateValue,
        type: 'Events',
        placeId: data.placeId ?? null,
        userId: userId,
        source: 'manual',
        visitNotes: data.visitNotes ?? null,
        visitRating: data.visitRating ?? null,
        visitReview: data.visitReview ?? null,
        status: 'active',
        goalCategory: null,
        targetValue: null,
        currentValue: 0,
        unit: null,
        isCompleted: false,
        streakCount: 0,
        completedInstances: 0,
        activityType: null,
        duration: null,
        caloriesBurned: null,
        milestones: null,
        ...(data.tags && { tags: data.tags }),
        ...(data.people && { people: data.people }),
      });

      return c.json<PlaceLogVisitOutput>(serializeVisit(event), 201);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.log-visit] unexpected error:', { error: err });
      throw new InternalError('');
    }
  })

  // Get user's visits
  .post('/my-visits', authMiddleware, zValidator('json', placeGetMyVisitsSchema), async (c) => {
    try {
      const userId = c.get('userId')!;

      const visits = await getVisitsByUser(userId);

      return c.json<PlaceGetMyVisitsOutput>(
        visits.map((visit) => serializeVisitFromService(visit) as PlaceGetMyVisitsOutput[number]),
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.my-visits] unexpected error:', { error: err });
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

        return c.json<PlaceGetPlaceVisitsOutput>(
          visits.map(
            (visit) => serializeVisitFromService(visit) as PlaceGetPlaceVisitsOutput[number],
          ),
          200,
        );
      } catch (err) {
        if (isServiceError(err)) {
          throw err;
        }

        logger.error('[places.place-visits] unexpected error:', { error: err });
        throw new InternalError('');
      }
    },
  )

  // Update visit
  .post('/update-visit', authMiddleware, zValidator('json', placeUpdateVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeUpdateVisitSchema>;

      const { id, ...rest } = input;

      // Filter out undefined values for exactOptionalPropertyTypes
      const updateData: Partial<typeof rest> = {};
      const entries = Object.entries(rest) as Array<
        [keyof typeof rest, (typeof rest)[keyof typeof rest]]
      >;

      entries.forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const updatedEvent = await updateVisit(id, updateData);

      if (!updatedEvent) {
        throw new NotFoundError('');
      }

      return c.json<PlaceUpdateVisitOutput>(serializeVisit(updatedEvent), 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.update-visit] unexpected error:', { error: err });
      throw new InternalError('');
    }
  })

  // Delete visit
  .post('/delete-visit', authMiddleware, zValidator('json', placeDeleteVisitSchema), async (c) => {
    try {
      const input = c.req.valid('json') as z.infer<typeof placeDeleteVisitSchema>;

      const success_ = await deleteVisit(input.id);

      if (!success_) {
        throw new NotFoundError('');
      }

      return c.json<PlaceDeleteVisitOutput>({ success: true }, 200);
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }

      logger.error('[places.delete-visit] unexpected error:', { error: err });
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
      const normalizedVisits = visits.map((visit) =>
        'event' in visit && visit.event ? visit.event : visit,
      );
      const ratings = normalizedVisits
        .map((visit) => visit.visitRating)
        .filter((rating): rating is number => typeof rating === 'number');
      const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : undefined;

      const sortedVisits = normalizedVisits.sort(
        (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
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

      visits.forEach((visit) => {
        visit.tags?.forEach((tag) => {
          tagCounts.set(tag.name, (tagCounts.get(tag.name) || 0) + 1);
        });
        visit.people?.forEach((person) => {
          const personName = `${person.firstName}${person.lastName ? ` ${person.lastName}` : ''}`;
          peopleCounts.set(personName, (peopleCounts.get(personName) || 0) + 1);
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

      logger.error('[places.visit-stats] unexpected error:', { error: err });
      throw new InternalError('');
    }
  });
