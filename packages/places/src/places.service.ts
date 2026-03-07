import crypto from 'node:crypto';
import { sql, type Selectable } from 'kysely';

import { db } from '@hominem/db';
import type { Database } from '@hominem/db';
import { normalizePhotoReference, sanitizeStoredPhotos } from '@hominem/utils/images';

import type { PlaceInput, PlaceOutput } from './contracts';
import { googlePlaces } from './google-places.service';
import { placeCache } from './place-cache';
import { isGooglePhotosUrl, type PlaceImagesService } from './place-images.service';

type PlaceRow = Selectable<Database['places']>;

interface PlaceMeta {
  googleMapsId: string;
  description: string | null;
  imageUrl: string | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  priceLevel: number | null;
  businessStatus: string | null;
  openingHours: string | null;
}

export type ListSummary = { id: string; name: string };

function toNumber(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMeta(data: Record<string, unknown> | null, fallbackGoogleMapsId: string): PlaceMeta {
  const payload = data ?? {};
  const photosRaw = payload.photos;
  const photos =
    Array.isArray(photosRaw) && photosRaw.every((photo) => typeof photo === 'string')
      ? photosRaw
      : null;

  const typesRaw = payload.types;
  const types =
    Array.isArray(typesRaw) && typesRaw.every((item) => typeof item === 'string') ? typesRaw : null;

  const priceLevelRaw = payload.priceLevel;
  const priceLevel =
    typeof priceLevelRaw === 'number'
      ? priceLevelRaw
      : typeof priceLevelRaw === 'string'
        ? Number.parseFloat(priceLevelRaw)
        : null;

  return {
    googleMapsId:
      typeof payload.googleMapsId === 'string' && payload.googleMapsId.length > 0
        ? payload.googleMapsId
        : fallbackGoogleMapsId,
    description: typeof payload.description === 'string' ? payload.description : null,
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : null,
    photos,
    types,
    websiteUri: typeof payload.websiteUri === 'string' ? payload.websiteUri : null,
    phoneNumber: typeof payload.phoneNumber === 'string' ? payload.phoneNumber : null,
    priceLevel: Number.isFinite(priceLevel ?? Number.NaN) ? (priceLevel as number) : null,
    businessStatus: typeof payload.businessStatus === 'string' ? payload.businessStatus : null,
    openingHours: typeof payload.openingHours === 'string' ? payload.openingHours : null,
  };
}

function rowToPlaceOutput(row: PlaceRow): PlaceOutput {
  const meta = toMeta((row.data as any) ?? null, row.id);
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : typeof row.created_at === 'string'
        ? row.created_at
        : new Date().toISOString();

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: meta.description,
    address: row.address,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    imageUrl: meta.imageUrl ?? meta.photos?.[0] ?? null,
    googleMapsId: meta.googleMapsId,
    rating: toNumber(row.rating),
    priceLevel: meta.priceLevel,
    photos: meta.photos,
    types: meta.types,
    websiteUri: meta.websiteUri,
    phoneNumber: meta.phoneNumber,
    businessStatus: meta.businessStatus,
    openingHours: meta.openingHours,
    createdAt,
    updatedAt: createdAt,
  };
}

function toLocationTuple(latitude?: number | null, longitude?: number | null): [number, number] {
  return latitude != null && longitude != null ? [longitude, latitude] : [0, 0];
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number): number => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function getPlaceImageUrl(place: Pick<PlaceOutput, 'imageUrl' | 'photos'>): string | null {
  return place.imageUrl ?? place.photos?.[0] ?? null;
}

function updateCacheForPlace(place: PlaceOutput): void {
  placeCache.set(`place:id:${place.id}`, place, placeCache.TTL_SHORT_MS);
  placeCache.set(`place:googleMapsId:${place.googleMapsId}`, place, placeCache.TTL_SHORT_MS);
}

export async function preparePlaceInsertData(data: PlaceInput): Promise<{
  id: string;
  userId: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  placeType: string | null;
  rating: number | null;
  data: PlaceMeta;
}> {
  const processedPhotos = data.photos ? sanitizeStoredPhotos(data.photos) : null;
  const imageUrl = data.imageUrl ? normalizePhotoReference(data.imageUrl) : null;

  return {
    id: crypto.randomUUID(),
    userId: data.userId ?? '',
    name: data.name,
    address: data.address ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    placeType: data.types?.[0] ?? null,
    rating: data.rating ?? null,
    data: {
      googleMapsId: data.googleMapsId,
      description: data.description ?? null,
      imageUrl: imageUrl ?? processedPhotos?.[0] ?? null,
      photos: processedPhotos,
      types: data.types ?? null,
      websiteUri: data.websiteUri ?? null,
      phoneNumber: data.phoneNumber ?? null,
      priceLevel: data.priceLevel ?? null,
      businessStatus: null,
      openingHours: null,
    },
  };
}

export async function getPlacePhotoById(id: string): Promise<string | undefined> {
  const place = await getPlaceById(id);
  return place?.photos?.[0];
}

export async function getPlaceById(id: string): Promise<PlaceOutput | undefined> {
  const cacheKey = `place:id:${id}`;
  const cached = placeCache.get(cacheKey);
  if (cached) {
    return cached as PlaceOutput;
  }

  const row = await db
    .selectFrom('places')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return undefined;
  }

  const output = rowToPlaceOutput(row);
  updateCacheForPlace(output);
  return output;
}

export async function getPlaceByGoogleMapsId(
  googleMapsId: string,
): Promise<PlaceOutput | undefined> {
  const cacheKey = `place:googleMapsId:${googleMapsId}`;
  const cached = placeCache.get(cacheKey);
  if (cached) {
    return cached as PlaceOutput;
  }

  const row = await db
    .selectFrom('places')
    .selectAll()
    .where(sql<boolean>`data->>'googleMapsId' = ${googleMapsId}`)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    return undefined;
  }

  const output = rowToPlaceOutput(row);
  updateCacheForPlace(output);
  return output;
}

async function getPlaceByGoogleMapsIdForUser(
  userId: string,
  googleMapsId: string,
): Promise<PlaceOutput | undefined> {
  const row = await db
    .selectFrom('places')
    .selectAll()
    .where('user_id', '=', userId)
    .where(sql<boolean>`data->>'googleMapsId' = ${googleMapsId}`)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();

  return row ? rowToPlaceOutput(row) : undefined;
}

export async function getPlacesByIds(ids: string[]): Promise<PlaceOutput[]> {
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .selectFrom('places')
    .selectAll()
    .where('id', 'in', ids)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return rows.map(rowToPlaceOutput);
}

export async function getPlacesByGoogleMapsIds(googleMapsIds: string[]): Promise<PlaceOutput[]> {
  if (googleMapsIds.length === 0) {
    return [];
  }

  const rows = await db
    .selectFrom('places')
    .selectAll()
    .where(sql<boolean>`data->>'googleMapsId' in (${sql.join(googleMapsIds)})`)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return rows.map(rowToPlaceOutput);
}

export async function processPlacePhotos(
  googleMapsId: string,
  photos: string[] = [],
  placeImagesService?: PlaceImagesService,
): Promise<string[]> {
  if (photos.length === 0) {
    return photos;
  }

  return Promise.all(
    photos.map(async (photoUrl, index) => {
      if (!isGooglePhotosUrl(photoUrl)) {
        return photoUrl;
      }
      if (!placeImagesService) {
        return photoUrl;
      }
      const stored = await placeImagesService.downloadAndStorePlaceImage(
        googleMapsId,
        photoUrl,
        index,
      );
      return stored ?? photoUrl;
    }),
  );
}

export async function upsertPlace({ data }: { data: PlaceInput }): Promise<PlaceOutput> {
  if (!data.userId) {
    throw new Error('upsertPlace requires data.userId');
  }

  const insertValues = await preparePlaceInsertData(data);
  const existing = await getPlaceByGoogleMapsIdForUser(data.userId, data.googleMapsId);

  if (existing) {
    const row = await db
      .updateTable('places')
      .set({
        name: insertValues.name,
        address: insertValues.address,
        latitude: insertValues.latitude,
        longitude: insertValues.longitude,
        place_type: insertValues.placeType,
        rating: insertValues.rating,
        data: insertValues.data as any,
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();

    if (!row) {
      throw new Error('Failed to update place');
    }

    const output = rowToPlaceOutput(row);
    updateCacheForPlace(output);
    return output;
  }

  const row = await db
    .insertInto('places')
    .values({
      id: insertValues.id,
      user_id: insertValues.userId,
      name: insertValues.name,
      address: insertValues.address,
      latitude: insertValues.latitude,
      longitude: insertValues.longitude,
      place_type: insertValues.placeType,
      rating: insertValues.rating,
      data: insertValues.data as any,
    })
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    throw new Error('Failed to insert place');
  }

  const output = rowToPlaceOutput(row);
  updateCacheForPlace(output);
  return output;
}

export async function createOrUpdatePlace(
  id: string,
  updates: Partial<
    Pick<
      PlaceOutput,
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
): Promise<PlaceOutput | undefined> {
  const existing = await getPlaceById(id);
  if (!existing) {
    return undefined;
  }

  const merged: PlaceInput = {
    userId: existing.userId,
    googleMapsId: existing.googleMapsId,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    address: updates.address ?? existing.address,
    latitude: updates.latitude ?? existing.latitude,
    longitude: updates.longitude ?? existing.longitude,
    location:
      updates.location ??
      toLocationTuple(
        updates.latitude ?? existing.latitude,
        updates.longitude ?? existing.longitude,
      ),
    types: updates.types ?? existing.types,
    rating: updates.rating ?? existing.rating,
    websiteUri: updates.websiteUri ?? existing.websiteUri,
    phoneNumber: updates.phoneNumber ?? existing.phoneNumber,
    priceLevel: updates.priceLevel ?? existing.priceLevel,
    photos: updates.photos ?? existing.photos,
    imageUrl: updates.imageUrl ?? existing.imageUrl,
  };

  const updated = await upsertPlace({ data: merged });
  if (updated.id !== id) {
    await db.deleteFrom('places').where('id', '=', id).execute();
  }
  return { ...updated, id };
}

export async function addPlaceToLists(
  userId: string,
  listIds: string[],
  placeData: PlaceInput,
): Promise<{
  place: PlaceOutput;
  success: boolean;
  addedToLists: number;
}> {
  const place = await upsertPlace({ data: { ...placeData, userId } });
  return {
    place,
    success: true,
    addedToLists: listIds.length,
  };
}

export async function removePlaceFromList(_params: {
  placeId: string;
  listId: string;
  userId: string;
}): Promise<null> {
  return null;
}

export async function getNearbyPlacesFromLists(params: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}): Promise<
  Array<PlaceOutput & { distance: { km: number; miles: number } | null; lists: ListSummary[] }>
> {
  const radiusKm = params.radiusKm ?? 50;
  const limit = params.limit ?? 20;

  const rows = await db
    .selectFrom('places')
    .selectAll()
    .where('user_id', '=', params.userId)
    .where('latitude', 'is not', null)
    .where('longitude', 'is not', null)
    .execute();

  const nearby = rows
    .map((row) => rowToPlaceOutput(row))
    .map((place) => {
      if (place.latitude === null || place.longitude === null) {
        return { place, distanceKm: Number.POSITIVE_INFINITY };
      }
      return {
        place,
        distanceKm: distanceKm(params.latitude, params.longitude, place.latitude, place.longitude),
      };
    })
    .filter((entry) => Number.isFinite(entry.distanceKm) && entry.distanceKm <= radiusKm)
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.place.name.localeCompare(b.place.name);
    })
    .slice(0, limit);

  return nearby.map((entry) => ({
    ...entry.place,
    distance: {
      km: entry.distanceKm,
      miles: entry.distanceKm * 0.621371,
    },
    lists: [],
  }));
}

export async function deletePlaceById(id: string): Promise<boolean> {
  const result = await db
    .deleteFrom('places')
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  const deleted = !!result;
  if (deleted) {
    placeCache.delete(`place:id:${id}`);
  }
  return deleted;
}

export async function refreshAllPlaces(): Promise<{ updatedCount: number; errors: string[] }> {
  const rows = await db
    .selectFrom('places')
    .selectAll()
    .where(sql<boolean>`data->>'googleMapsId' IS NOT NULL`)
    .execute();

  let updatedCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const place = rowToPlaceOutput(row);
    try {
      const details = await googlePlaces.getDetails({
        placeId: place.googleMapsId,
        forceFresh: true,
      });
      const photos = Array.isArray(details.photos)
        ? details.photos
            .map((photo) => photo?.name)
            .filter((name): name is string => typeof name === 'string' && name.length > 0)
        : [];

      await upsertPlace({
        data: {
          userId: place.userId,
          googleMapsId: place.googleMapsId,
          name: details.displayName?.text ?? place.name,
          description: place.description,
          address: details.formattedAddress ?? place.address,
          latitude: details.location?.latitude ?? place.latitude,
          longitude: details.location?.longitude ?? place.longitude,
          types: details.types ?? place.types,
          rating: typeof details.rating === 'number' ? details.rating : place.rating,
          websiteUri: details.websiteUri ?? place.websiteUri,
          phoneNumber: details.nationalPhoneNumber ?? place.phoneNumber,
          priceLevel:
            typeof details.priceLevel === 'number' ? details.priceLevel : place.priceLevel,
          photos: photos.length > 0 ? photos : place.photos,
          imageUrl: place.imageUrl,
        },
      });
      updatedCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to refresh place ${place.id}: ${message}`);
    }
  }

  return { updatedCount, errors };
}

export async function updatePlacePhotosFromGoogle(
  placeId: string,
  options?: {
    forceFresh?: boolean | undefined;
    placeImagesService?: PlaceImagesService | undefined;
    googleApiKey?: string | undefined;
  },
): Promise<boolean> {
  const existing = await getPlaceById(placeId);
  if (!existing?.googleMapsId) {
    return false;
  }

  if (!(options?.placeImagesService && options?.googleApiKey)) {
    throw new Error('updatePlacePhotosFromGoogle requires placeImagesService and googleApiKey');
  }

  const details = await googlePlaces.getDetails({
    placeId: existing.googleMapsId,
    ...(options.forceFresh !== undefined ? { forceFresh: options.forceFresh } : {}),
  });

  const photoRefs = Array.isArray(details.photos)
    ? details.photos
        .map((photo) => photo?.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
        .map(
          (name) =>
            `https://places.googleapis.com/v1/${name}/media?key=${options.googleApiKey}&maxHeightPx=1600&maxWidthPx=1600`,
        )
    : [];

  if (photoRefs.length === 0) {
    return false;
  }

  const processed = await processPlacePhotos(
    existing.googleMapsId,
    photoRefs,
    options.placeImagesService,
  );

  if (processed.length === 0) {
    return false;
  }

  const current = existing.photos ?? [];
  const changed = JSON.stringify(current) !== JSON.stringify(processed);
  if (!changed) {
    return false;
  }

  await createOrUpdatePlace(existing.id, {
    photos: processed,
    imageUrl: processed[0] ?? null,
  });

  return true;
}
