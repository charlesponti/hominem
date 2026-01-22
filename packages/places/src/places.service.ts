import { db } from '@hominem/db';
import {
  type Item as ItemSelect,
  item,
  type ListSelect,
  list,
  type PlaceInsert,
  type Place as PlaceSelect,
  place,
} from '@hominem/db/schema';

import { googlePlaces } from '@hominem/services/google-places';
import { GOOGLE_PLACES_BASE_URL } from '@hominem/utils/google';
import { normalizePhotoReference, sanitizeStoredPhotos } from '@hominem/utils/images';
import { and, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { isGooglePhotosUrl, type PlaceImagesService } from './place-images.service';

export type ListSummary = { id: string; name: string };

/**
 * Computes imageUrl from place database values.
 * Returns imageUrl if set, otherwise falls back to first photo.
 */
export function getPlaceImageUrl(place: Pick<PlaceSelect, 'imageUrl' | 'photos'>): string | null {
  return place.imageUrl ?? place.photos?.[0] ?? null;
}

import { placeCache } from './place-cache';

function toLocationTuple(latitude?: number | null, longitude?: number | null): [number, number] {
  return latitude != null && longitude != null ? [longitude, latitude] : [0, 0];
}

function extractListSummaries(
  records: Array<{ list: Pick<ListSelect, 'id' | 'name'> | null }>,
): ListSummary[] {
  return records
    .map((record) => record.list)
    .filter((list): list is { id: string; name: string } => Boolean(list))
    .map((list) => ({ id: list.id, name: list.name }));
}

const placeUpdateSet = {
  name: sql`EXCLUDED.name`,
  address: sql`EXCLUDED.address`,
  latitude: sql`EXCLUDED.latitude`,
  longitude: sql`EXCLUDED.longitude`,
  location: sql`EXCLUDED.location`,
  types: sql`EXCLUDED.types`,
  rating: sql`EXCLUDED.rating`,
  websiteUri: sql`EXCLUDED."websiteUri"`,
  phoneNumber: sql`EXCLUDED."phoneNumber"`,
  priceLevel: sql`EXCLUDED."priceLevel"`,
  photos: sql`EXCLUDED.photos`,
  imageUrl: sql`COALESCE(EXCLUDED."imageUrl", CASE WHEN EXCLUDED.photos IS NOT NULL AND array_length(EXCLUDED.photos, 1) > 0 THEN EXCLUDED.photos[1] ELSE place."imageUrl" END)`,
  updatedAt: new Date().toISOString(),
};

function updateCacheForPlace(result: PlaceSelect): void {
  placeCache.delete(`place:id:${result.id}`);
  placeCache.delete(`place:googleMapsId:${result.googleMapsId}`);
  placeCache.set(`place:id:${result.id}`, result, placeCache.TTL_SHORT_MS);
  placeCache.set(`place:googleMapsId:${result.googleMapsId}`, result);
}

export async function preparePlaceInsertData(data: PlaceInsert): Promise<{
  id: string;
  googleMapsId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  location: [number, number];
  types: string[] | null;
  rating: number | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  priceLevel: number | null;
  photos: string[] | null;
  imageUrl: string | null;
}> {
  const processedPhotos = data.photos ? sanitizeStoredPhotos(data.photos) : null;
  const imageUrl = data.imageUrl ? normalizePhotoReference(data.imageUrl) : null;

  return {
    id: crypto.randomUUID(),
    googleMapsId: data.googleMapsId,
    name: data.name,
    address: data.address ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    location: data.location ?? toLocationTuple(data.latitude, data.longitude),
    types: data.types ?? null,
    rating: data.rating ?? null,
    websiteUri: data.websiteUri ?? null,
    phoneNumber: data.phoneNumber ?? null,
    priceLevel: data.priceLevel ?? null,
    photos: processedPhotos,
    imageUrl:
      imageUrl ?? (processedPhotos && processedPhotos.length > 0 ? processedPhotos[0]! : null),
  };
}

export async function getPlacePhotoById(id: string): Promise<string | undefined> {
  return db
    .select({
      photos: place.photos,
    })
    .from(place)
    .where(eq(place.id, id))
    .limit(1)
    .then((results) => results[0]?.photos?.[0]);
}

export async function getPlaceById(id: string): Promise<PlaceSelect | undefined> {
  const cacheKey = `place:id:${id}`;
  const cached = placeCache.get(cacheKey);
  if (cached) {
    return cached as PlaceSelect;
  }

  const result = await db.query.place.findFirst({ where: eq(place.id, id) });
  if (result) {
    placeCache.set(cacheKey, result, placeCache.TTL_SHORT_MS);
  }
  return result as unknown as PlaceSelect | undefined;
}

export async function getPlaceByGoogleMapsId(
  googleMapsId: string,
): Promise<PlaceSelect | undefined> {
  const cacheKey = `place:googleMapsId:${googleMapsId}`;
  const cached = placeCache.get(cacheKey);
  if (cached) {
    return cached as PlaceSelect;
  }

  const result = await db.query.place.findFirst({
    where: eq(place.googleMapsId, googleMapsId),
  });
  if (result) {
    placeCache.set(cacheKey, result, placeCache.TTL_SHORT_MS);
  }
  return result as unknown as PlaceSelect | undefined;
}

export async function getPlacesByIds(ids: string[]): Promise<PlaceSelect[]> {
  if (ids.length === 0) {
    return [];
  }
  return db.query.place.findMany({ where: inArray(place.id, ids) });
}

export async function getPlacesByGoogleMapsIds(googleMapsIds: string[]): Promise<PlaceSelect[]> {
  if (googleMapsIds.length === 0) {
    return [];
  }
  return db.query.place.findMany({
    where: inArray(place.googleMapsId, googleMapsIds),
  });
}

/**
 * Processes photos array to download Google Photos URLs and replace with Supabase URLs
 * @param googleMapsId - The Google Maps ID for the place
 * @param photos - Array of photo URLs (may contain Google Photos URLs)
 * @returns Array with Supabase URLs replacing Google Photos URLs
 */
export async function processPlacePhotos(
  googleMapsId: string,
  photos: string[] = [],
  placeImagesService?: PlaceImagesService,
): Promise<string[]> {
  if (photos.length === 0) {
    return photos;
  }

  const processedPhotos = await Promise.all(
    photos.map(async (photoUrl, index) => {
      // If it's a Google Photos URL, download and store it
      if (isGooglePhotosUrl(photoUrl)) {
        if (!placeImagesService) {
          // No service provided; skip download and keep original URL
          return photoUrl;
        }

        // Use the provided service with the photo index
        const supabaseUrl = await placeImagesService.downloadAndStorePlaceImage(
          googleMapsId,
          photoUrl,
          index,
        );
        return supabaseUrl || photoUrl; // Fallback to original if download fails
      }
      // If it's already a Supabase URL or other URL, keep it
      return photoUrl;
    }),
  );

  return processedPhotos;
}

export async function upsertPlace({ data }: { data: PlaceInsert }): Promise<PlaceSelect> {
  const insertValues = await preparePlaceInsertData(data);

  const [result] = await db
    .insert(place)
    .values(insertValues)
    .onConflictDoUpdate({
      target: place.googleMapsId,
      set: placeUpdateSet,
    })
    .returning();

  if (!result) {
    throw new Error('Failed to ensure place');
  }

  updateCacheForPlace(result);

  return result;
}

export async function createOrUpdatePlace(
  id: string,
  updates: Partial<
    Pick<
      PlaceSelect,
      | 'name'
      | 'description'
      | 'address'
      | 'latitude'
      | 'longitude'
      | 'imageUrl'
      | 'rating'
      | 'types'
      | 'websiteUri'
      | 'phoneNumber'
      | 'priceLevel'
      | 'photos'
    >
  > & { location?: [number, number] },
): Promise<PlaceSelect | undefined> {
  const [updated] = await db
    .update(place)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(place.id, id))
    .returning();

  if (updated) {
    updateCacheForPlace(updated);
  }

  return updated;
}

/**
 * Fetch photo references (names) from Google Places for a place.
 */
async function fetchGooglePlacePhotoNames(
  googleMapsId: string,
  limit = 6,
  forceFresh = false,
  apiKey?: string,
): Promise<string[]> {
  if (!apiKey) {
    throw new Error('Google API key required to fetch photo names');
  }

  // Use the same fields approach as apps/rocco
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/places/${googleMapsId}`);
  if (forceFresh) {
    // Bypass any caches by not adding custom caching here. Caller is responsible.
  }
  url.searchParams.set('fields', 'photos');

  const headers = new Headers({ 'X-Goog-Api-Key': apiKey });

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    // Return empty array on error; worker should log and retry if needed
    return [];
  }

  const json = (await res.json()) as { photos?: Array<{ name?: string }> };
  const photos = json.photos ?? [];
  return photos
    .map((p) => p.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .slice(0, limit);
}

/**
 * Update a place's photos by fetching photo references from Google Places and
 * invoking the existing `upsertPlace` flow to download/store images.
 * Returns true if the place was updated (photos changed), false otherwise.
 */
export async function updatePlacePhotosFromGoogle(
  placeId: string,
  options?: {
    forceFresh?: boolean;
    // Developer must provide a service with API key for downloading photos
    placeImagesService?: PlaceImagesService;
    googleApiKey?: string;
  },
): Promise<boolean> {
  const forceFresh = options?.forceFresh ?? false;
  const existing = await getPlaceById(placeId);
  if (!existing?.googleMapsId) {
    return false;
  }

  if (!(options?.placeImagesService && options?.googleApiKey)) {
    throw new Error(
      'updatePlacePhotosFromGoogle requires placeImagesService and googleApiKey in options',
    );
  }

  const fetchedPhotoNames = await fetchGooglePlacePhotoNames(
    existing.googleMapsId,
    6,
    forceFresh,
    options.googleApiKey,
  );
  if (!fetchedPhotoNames || fetchedPhotoNames.length === 0) {
    return false;
  }

  // Build a PlaceInsert object using existing fields and fetched photo names
  const placeData: PlaceInsert = {
    googleMapsId: existing.googleMapsId,
    name: existing.name,
    address: existing.address ?? null,
    latitude: existing.latitude ?? null,
    longitude: existing.longitude ?? null,
    location: [existing.latitude ?? 0, existing.longitude ?? 0],
    types: existing.types ?? null,
    rating: existing.rating ?? null,
    websiteUri: existing.websiteUri ?? null,
    phoneNumber: existing.phoneNumber ?? null,
    priceLevel: existing.priceLevel ?? null,
    photos: fetchedPhotoNames,
    imageUrl: existing.imageUrl ?? null,
  };

  // Call upsertPlace with the provided media URL builder and service
  const updated = await upsertPlace({
    data: placeData,
  });

  // If the DB record now includes photos, return true
  return !!(updated?.photos && updated.photos.length > 0);
}

export async function deletePlaceById(id: string): Promise<boolean> {
  const result = await db.delete(place).where(eq(place.id, id)).returning({ id: place.id });
  return result.length > 0;
}

export async function addPlaceToLists(userId: string, listIds: string[], placeData: PlaceInsert) {
  return db.transaction(async (tx) => {
    const placeRecord = await upsertPlace({ data: placeData });

    const itemInsertValues = listIds.map((listId) => ({
      listId,
      itemId: placeRecord.id,
      userId,
      type: 'PLACE' as const,
      itemType: 'PLACE' as const,
      id: crypto.randomUUID(),
    }));

    if (itemInsertValues.length > 0) {
      // Use RETURNING to get inserted items directly, avoiding extra query
      const insertedItems = await tx
        .insert(item)
        .values(itemInsertValues)
        .onConflictDoNothing()
        .returning({
          id: item.id,
          listId: item.listId,
          itemId: item.itemId,
        });

      // Fetch list details for the inserted items
      if (insertedItems.length > 0) {
        const insertedListIds = insertedItems.map((i) => i.listId);
        const listsData = await tx.query.list.findMany({
          where: inArray(list.id, insertedListIds),
          columns: { id: true, name: true },
        });

        const affectedLists = listsData.map((l) => ({
          id: l.id,
          name: l.name,
        }));
        return { place: placeRecord, lists: affectedLists };
      }
    }

    // If no items were inserted (all conflicts), fetch existing items
    const itemsInLists = await tx.query.item.findMany({
      where: and(eq(item.itemId, placeRecord.id), eq(item.itemType, 'PLACE')),
      with: {
        list: { columns: { id: true, name: true } },
      },
    });

    const affectedLists = extractListSummaries(itemsInLists);

    return { place: placeRecord, lists: affectedLists };
  });
}

export async function getPlaceLists(placeId: string): Promise<ListSummary[]> {
  const itemsInLists = await db.query.item.findMany({
    where: and(eq(item.itemId, placeId), eq(item.itemType, 'PLACE')),
    with: {
      list: {
        columns: { id: true, name: true },
      },
    },
  });

  return extractListSummaries(itemsInLists);
}

export async function removePlaceFromList(params: {
  listId: string;
  placeIdentifier: string;
  userId: string;
}): Promise<boolean> {
  const { listId, placeIdentifier, userId } = params;

  const listAuthCheck = await db.query.list.findFirst({
    where: and(eq(list.id, listId), eq(list.userId, userId)),
  });
  if (!listAuthCheck) {
    throw new Error('Forbidden: You do not own this list.');
  }

  const placeToDelete = await db.query.place.findFirst({
    where: or(eq(place.id, placeIdentifier), eq(place.googleMapsId, placeIdentifier)),
    columns: { id: true },
  });

  if (!placeToDelete) {
    throw new Error('Place not found in database.');
  }

  const deletedItems = await db
    .delete(item)
    .where(
      and(
        eq(item.listId, listId),
        eq(item.itemId, placeToDelete.id),
        eq(item.itemType, 'PLACE'),
        eq(item.userId, userId),
      ),
    )
    .returning({ id: item.id });

  return deletedItems.length > 0;
}

export async function getNearbyPlacesFromLists(params: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
}) {
  const { userId, latitude, longitude, radiusKm, limit: resultLimit } = params;

  const nearbyPlaces = await db
    .select({
      id: place.id,
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      googleMapsId: place.googleMapsId,
      types: place.types,
      imageUrl: sql<string | null>`COALESCE(${place.imageUrl}, ${place.photos}[1])`.as('imageUrl'),
      rating: place.rating,
      photos: place.photos,
      websiteUri: place.websiteUri,
      phoneNumber: place.phoneNumber,
      priceLevel: place.priceLevel,
      listId: list.id,
      listName: list.name,
      distance: sql<number>`ST_Distance(
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${place.location}::geography
            )`.as('distance'),
    })
    .from(place)
    .innerJoin(item, eq(item.itemId, place.id))
    .innerJoin(list, eq(list.id, item.listId))
    .where(
      and(
        eq(item.itemType, 'PLACE'),
        or(eq(list.userId, userId), eq(item.userId, userId)),
        sql`ST_DWithin(
                ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
                ${place.location}::geography,
                ${radiusKm * 1000}
              )`,
      ),
    )
    .orderBy(sql`distance ASC`)
    .limit(resultLimit);

  const placesMap = new Map<
    string,
    {
      id: string;
      name: string;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      googleMapsId: string;
      types: string[] | null;
      imageUrl: string | null;
      rating: number | null;
      photos: string[] | null;
      websiteUri: string | null;
      phoneNumber: string | null;
      priceLevel: number | null;
      distance: number;
      lists: Array<{ id: string; name: string }>;
    }
  >();

  for (const row of nearbyPlaces) {
    const existing = placesMap.get(row.id);
    if (existing) {
      if (!existing.lists.some((l) => l.id === row.listId)) {
        existing.lists.push({ id: row.listId, name: row.listName });
      }
    } else {
      placesMap.set(row.id, {
        id: row.id,
        name: row.name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        googleMapsId: row.googleMapsId,
        types: row.types,
        imageUrl: row.imageUrl,
        rating: row.rating,
        photos: row.photos,
        websiteUri: row.websiteUri,
        phoneNumber: row.phoneNumber,
        priceLevel: row.priceLevel,
        distance: row.distance,
        lists: [{ id: row.listId, name: row.listName }],
      });
    }
  }

  return Array.from(placesMap.values());
}

export async function getItemsForPlace(
  placeId: string,
): Promise<Array<ItemSelect & { list: Pick<ListSelect, 'id' | 'name'> | null }>> {
  return db.query.item.findMany({
    where: and(eq(item.itemId, placeId), eq(item.itemType, 'PLACE')),
    with: {
      list: {
        columns: { id: true, name: true },
      },
    },
  });
}

export async function updatePlacePhotos(placeId: string, photos: string[]): Promise<void> {
  await db
    .update(place)
    .set({
      photos,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(place.id, placeId));
}

export async function listPlacesMissingPhotos(): Promise<PlaceSelect[]> {
  return db.query.place.findMany({
    where: and(isNotNull(place.googleMapsId), isNull(place.photos)),
  });
}

export async function refreshAllPlaces() {
  // Find all places missing photos (or other stale data)
  const places = await listPlacesMissingPhotos();
  let updatedCount = 0;
  const errors: string[] = [];

  for (const placeRecord of places) {
    try {
      // Fetch latest data from Google Maps API
      const googleData = await googlePlaces.getDetails({
        placeId: placeRecord.googleMapsId,
      });

      if (!googleData) {
        errors.push(`Place ${placeRecord.id} not found on Google Maps`);
        continue;
      }

      await upsertPlace({
        data: {
          googleMapsId: googleData.id!,
          name: googleData.displayName?.text ?? placeRecord.name,
          address: googleData.formattedAddress ?? placeRecord.address,
          latitude: googleData.location?.latitude ?? placeRecord.latitude,
          longitude: googleData.location?.longitude ?? placeRecord.longitude,
          location: [
            googleData.location?.latitude ?? placeRecord.latitude ?? 0,
            googleData.location?.longitude ?? placeRecord.longitude ?? 0,
          ],
          types: googleData.types ?? placeRecord.types,
          phoneNumber: googleData.nationalPhoneNumber ?? placeRecord.phoneNumber,
          websiteUri: googleData.websiteUri ?? placeRecord.websiteUri,
          priceLevel:
            googleData.priceLevel === 'PRICE_LEVEL_UNSPECIFIED' || !googleData.priceLevel
              ? null
              : (googleData.priceLevel as unknown as number),
          photos: googleData.photos?.map((p) => p.name!) ?? [],
        },
      });
      updatedCount++;
    } catch (err) {
      errors.push(`Failed for ${placeRecord.id}: ${String(err)}`);
    }
  }

  return { updatedCount, errors };
}

export type { PlaceSelect as Place, PlaceInsert };
