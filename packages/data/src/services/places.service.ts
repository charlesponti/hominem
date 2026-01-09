import { placeImagesStorageService } from '@hominem/utils/supabase'
import { and, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  type Item as ItemSelect,
  item,
  type ListSelect,
  list,
  type PlaceInsert,
  type Place as PlaceSelect,
  place,
} from '../db/schema'
import {
  downloadImage,
  generatePlaceImageFilename,
  getExtensionFromContentType,
  isGooglePhotosUrl,
} from './place-images.service'

export type ListSummary = { id: string; name: string }

/**
 * Computes imageUrl from place database values.
 * Returns imageUrl if set, otherwise falls back to first photo.
 */
export function getPlaceImageUrl(place: Pick<PlaceSelect, 'imageUrl' | 'photos'>): string | null {
  return place.imageUrl ?? place.photos?.[0] ?? null
}

// In-memory cache for place lookups
type CacheEntry<T> = {
  data: T
  expiresAt: number
}

class PlaceCache {
  private cache = new Map<string, CacheEntry<PlaceSelect>>()
  readonly TTL_MS = 5 * 60 * 1000 // 5 minutes for googleMapsId lookups
  readonly TTL_SHORT_MS = 2 * 60 * 1000 // 2 minutes for id lookups

  get(key: string): PlaceSelect | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: PlaceSelect, ttl: number = this.TTL_MS): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

const placeCache = new PlaceCache()

// Cleanup expired entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      placeCache.cleanup()
    },
    10 * 60 * 1000
  )
}

function toLocationTuple(latitude?: number | null, longitude?: number | null): [number, number] {
  return latitude != null && longitude != null ? [longitude, latitude] : [0, 0]
}

function extractListSummaries(
  records: Array<{ list: Pick<ListSelect, 'id' | 'name'> | null }>
): ListSummary[] {
  return records
    .map((record) => record.list)
    .filter((list): list is { id: string; name: string } => Boolean(list))
    .map((list) => ({ id: list.id, name: list.name }))
}

export async function getPlacePhotoById(id: string): Promise<string | undefined> {
  return db
    .select({
      photos: place.photos,
    })
    .from(place)
    .where(eq(place.id, id))
    .limit(1)
    .then((results) => results[0]?.photos?.[0])
}

export async function getPlaceById(id: string): Promise<PlaceSelect | undefined> {
  const cacheKey = `place:id:${id}`
  const cached = placeCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const result = await db.query.place.findFirst({ where: eq(place.id, id) })
  if (result) {
    placeCache.set(cacheKey, result, placeCache.TTL_SHORT_MS)
  }
  return result
}

export async function getPlaceByGoogleMapsId(
  googleMapsId: string
): Promise<PlaceSelect | undefined> {
  const cacheKey = `place:googleMapsId:${googleMapsId}`
  const cached = placeCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const result = await db.query.place.findFirst({
    where: eq(place.googleMapsId, googleMapsId),
  })
  if (result) {
    placeCache.set(cacheKey, result)
  }
  return result
}

export async function getPlacesByIds(ids: string[]): Promise<PlaceSelect[]> {
  if (ids.length === 0) {
    return []
  }
  return db.query.place.findMany({ where: inArray(place.id, ids) })
}

export async function getPlacesByGoogleMapsIds(googleMapsIds: string[]): Promise<PlaceSelect[]> {
  if (googleMapsIds.length === 0) {
    return []
  }
  return db.query.place.findMany({
    where: inArray(place.googleMapsId, googleMapsIds),
  })
}

/**
 * Downloads a Google Photos image and uploads it to Supabase Storage
 * @param googleMapsId - The Google Maps ID for the place
 * @param photoUrl - The Google Photos URL to download
 * @param buildPhotoMediaUrl - Function to build the full media URL with API key
 * @returns The Supabase Storage URL or null if download fails
 */
async function downloadAndStoreImage(
  googleMapsId: string,
  photoUrl: string,
  buildPhotoMediaUrl: (url: string) => string
): Promise<string | null> {
  try {
    // Build the full media URL with API key
    const fullUrl = buildPhotoMediaUrl(photoUrl)

    // Download the image
    const { buffer, contentType } = await downloadImage({ url: fullUrl })

    // Generate a consistent filename
    const baseFilename = generatePlaceImageFilename(googleMapsId)
    const extension = getExtensionFromContentType(contentType)
    const filename = `${baseFilename}${extension}`

    // Store in Supabase Storage under places/{googleMapsId}/
    const storedFile = await placeImagesStorageService.storeFile(
      buffer,
      filename,
      contentType,
      `places/${googleMapsId}`
    )

    return storedFile.url
  } catch (error) {
    console.error('Failed to download and store place image:', {
      googleMapsId,
      photoUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Processes photos array to download Google Photos URLs and replace with Supabase URLs
 * @param googleMapsId - The Google Maps ID for the place
 * @param photos - Array of photo URLs (may contain Google Photos URLs)
 * @param buildPhotoMediaUrl - Function to build the full media URL with API key
 * @returns Array with Supabase URLs replacing Google Photos URLs
 */
async function processPlacePhotos(
  googleMapsId: string,
  photos: string[] | null,
  buildPhotoMediaUrl: (url: string) => string
): Promise<string[]> {
  if (!photos || photos.length === 0) {
    return []
  }

  const processedPhotos = await Promise.all(
    photos.map(async (photoUrl) => {
      // If it's a Google Photos URL, download and store it
      if (isGooglePhotosUrl(photoUrl)) {
        const supabaseUrl = await downloadAndStoreImage(googleMapsId, photoUrl, buildPhotoMediaUrl)
        return supabaseUrl || photoUrl // Fallback to original if download fails
      }
      // If it's already a Supabase URL or other URL, keep it
      return photoUrl
    })
  )

  return processedPhotos
}

export async function ensurePlaceFromGoogleData(
  data: PlaceInsert,
  buildPhotoMediaUrl?: (url: string) => string
): Promise<PlaceSelect> {
  // Process photos to download Google Photos URLs
  let processedPhotos = data.photos ?? null
  let processedImageUrl = data.imageUrl ?? null

  if (buildPhotoMediaUrl) {
    processedPhotos = await processPlacePhotos(
      data.googleMapsId,
      data.photos ?? null,
      buildPhotoMediaUrl
    )

    // Also process the main imageUrl if it's a Google Photos URL
    if (processedImageUrl && isGooglePhotosUrl(processedImageUrl)) {
      const supabaseUrl = await downloadAndStoreImage(
        data.googleMapsId,
        processedImageUrl,
        buildPhotoMediaUrl
      )
      processedImageUrl = supabaseUrl || processedImageUrl
    }
  }

  // Set imageUrl from photos if not provided
  const imageUrl =
    processedImageUrl ?? (processedPhotos && processedPhotos.length > 0 ? processedPhotos[0] : null)

  const insertValues = {
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
    imageUrl,
  }

  const [result] = await db
    .insert(place)
    .values(insertValues)
    .onConflictDoUpdate({
      target: place.googleMapsId,
      set: {
        // Always update name if provided
        name: sql`EXCLUDED.name`,
        // Update address if provided (can be null)
        address: sql`EXCLUDED.address`,
        // Update location if latitude/longitude are provided
        latitude: sql`EXCLUDED.latitude`,
        longitude: sql`EXCLUDED.longitude`,
        location: sql`EXCLUDED.location`,
        // Update types if provided
        types: sql`EXCLUDED.types`,
        // Update rating if provided (can be null)
        rating: sql`EXCLUDED.rating`,
        // Update websiteUri if provided (can be null)
        websiteUri: sql`EXCLUDED."websiteUri"`,
        // Update phoneNumber if provided (can be null)
        phoneNumber: sql`EXCLUDED."phoneNumber"`,
        // Update priceLevel if provided (can be null)
        priceLevel: sql`EXCLUDED."priceLevel"`,
        // Update photos if provided
        photos: sql`EXCLUDED.photos`,
        // Update imageUrl: use EXCLUDED if provided, otherwise use first photo if photos exist
        imageUrl: sql`COALESCE(EXCLUDED."imageUrl", CASE WHEN EXCLUDED.photos IS NOT NULL AND array_length(EXCLUDED.photos, 1) > 0 THEN EXCLUDED.photos[1] ELSE place."imageUrl" END)`,
        updatedAt: new Date().toISOString(),
      },
    })
    .returning()

  if (!result) {
    throw new Error('Failed to ensure place')
  }

  // Invalidate cache for this place
  placeCache.delete(`place:id:${result.id}`)
  placeCache.delete(`place:googleMapsId:${result.googleMapsId}`)
  // Update cache with new data
  placeCache.set(`place:id:${result.id}`, result, placeCache.TTL_SHORT_MS)
  placeCache.set(`place:googleMapsId:${result.googleMapsId}`, result)

  return result
}

export async function ensurePlacesFromGoogleData(
  placesData: PlaceInsert[],
  buildPhotoMediaUrl?: (url: string) => string
): Promise<PlaceSelect[]> {
  if (placesData.length === 0) {
    return []
  }

  // Process each place's photos in parallel
  const processedPlacesData = await Promise.all(
    placesData.map(async (data) => {
      let processedPhotos = data.photos ?? null
      let processedImageUrl = data.imageUrl ?? null

      if (buildPhotoMediaUrl) {
        processedPhotos = await processPlacePhotos(
          data.googleMapsId,
          data.photos ?? null,
          buildPhotoMediaUrl
        )

        // Also process the main imageUrl if it's a Google Photos URL
        if (processedImageUrl && isGooglePhotosUrl(processedImageUrl)) {
          const supabaseUrl = await downloadAndStoreImage(
            data.googleMapsId,
            processedImageUrl,
            buildPhotoMediaUrl
          )
          processedImageUrl = supabaseUrl || processedImageUrl
        }
      }

      const imageUrl =
        processedImageUrl ??
        (processedPhotos && processedPhotos.length > 0 ? processedPhotos[0] : null)

      return {
        ...data,
        photos: processedPhotos,
        imageUrl,
      }
    })
  )

  const insertValues = processedPlacesData.map((data) => {
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
      photos: data.photos ?? null,
      imageUrl: data.imageUrl ?? null,
    }
  })

  const results = await db
    .insert(place)
    .values(insertValues)
    .onConflictDoUpdate({
      target: place.googleMapsId,
      set: {
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
      },
    })
    .returning()

  return results
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
  > & { location?: [number, number] }
): Promise<PlaceSelect | undefined> {
  const [updated] = await db
    .update(place)
    .set({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(place.id, id))
    .returning()

  if (updated) {
    // Invalidate and update cache
    placeCache.delete(`place:id:${id}`)
    placeCache.delete(`place:googleMapsId:${updated.googleMapsId}`)
    placeCache.set(`place:id:${id}`, updated, placeCache.TTL_SHORT_MS)
    placeCache.set(`place:googleMapsId:${updated.googleMapsId}`, updated)
  }

  return updated
}

export async function deletePlaceById(id: string): Promise<boolean> {
  const result = await db.delete(place).where(eq(place.id, id)).returning({ id: place.id })
  return result.length > 0
}

export async function addPlaceToLists(
  userId: string,
  listIds: string[],
  placeData: PlaceInsert,
  buildPhotoMediaUrl?: (url: string) => string
) {
  return db.transaction(async (tx) => {
    const placeRecord = await ensurePlaceFromGoogleData(placeData, buildPhotoMediaUrl)

    const itemInsertValues = listIds.map((listId) => ({
      listId,
      itemId: placeRecord.id,
      userId,
      type: 'PLACE' as const,
      itemType: 'PLACE' as const,
      id: crypto.randomUUID(),
    }))

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
        })

      // Fetch list details for the inserted items
      if (insertedItems.length > 0) {
        const insertedListIds = insertedItems.map((i) => i.listId)
        const listsData = await tx.query.list.findMany({
          where: inArray(list.id, insertedListIds),
          columns: { id: true, name: true },
        })

        const affectedLists = listsData.map((l) => ({
          id: l.id,
          name: l.name,
        }))
        return { place: placeRecord, lists: affectedLists }
      }
    }

    // If no items were inserted (all conflicts), fetch existing items
    const itemsInLists = await tx.query.item.findMany({
      where: and(eq(item.itemId, placeRecord.id), eq(item.itemType, 'PLACE')),
      with: {
        list: { columns: { id: true, name: true } },
      },
    })

    const affectedLists = extractListSummaries(itemsInLists)

    return { place: placeRecord, lists: affectedLists }
  })
}

export async function getPlaceLists(placeId: string): Promise<ListSummary[]> {
  const itemsInLists = await db.query.item.findMany({
    where: and(eq(item.itemId, placeId), eq(item.itemType, 'PLACE')),
    with: {
      list: {
        columns: { id: true, name: true },
      },
    },
  })

  return extractListSummaries(itemsInLists)
}

export async function removePlaceFromList(params: {
  listId: string
  placeIdentifier: string
  userId: string
}): Promise<boolean> {
  const { listId, placeIdentifier, userId } = params

  const listAuthCheck = await db.query.list.findFirst({
    where: and(eq(list.id, listId), eq(list.userId, userId)),
  })
  if (!listAuthCheck) {
    throw new Error('Forbidden: You do not own this list.')
  }

  const placeToDelete = await db.query.place.findFirst({
    where: or(eq(place.id, placeIdentifier), eq(place.googleMapsId, placeIdentifier)),
    columns: { id: true },
  })

  if (!placeToDelete) {
    throw new Error('Place not found in database.')
  }

  const deletedItems = await db
    .delete(item)
    .where(
      and(
        eq(item.listId, listId),
        eq(item.itemId, placeToDelete.id),
        eq(item.itemType, 'PLACE'),
        eq(item.userId, userId)
      )
    )
    .returning({ id: item.id })

  return deletedItems.length > 0
}

export async function getNearbyPlacesFromLists(params: {
  userId: string
  latitude: number
  longitude: number
  radiusKm: number
  limit: number
}) {
  const { userId, latitude, longitude, radiusKm, limit: resultLimit } = params

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
              )`
      )
    )
    .orderBy(sql`distance ASC`)
    .limit(resultLimit)

  const placesMap = new Map<
    string,
    {
      id: string
      name: string
      address: string | null
      latitude: number | null
      longitude: number | null
      googleMapsId: string
      types: string[] | null
      imageUrl: string | null
      rating: number | null
      photos: string[] | null
      websiteUri: string | null
      phoneNumber: string | null
      priceLevel: number | null
      distance: number
      lists: Array<{ id: string; name: string }>
    }
  >()

  for (const row of nearbyPlaces) {
    const existing = placesMap.get(row.id)
    if (existing) {
      if (!existing.lists.some((l) => l.id === row.listId)) {
        existing.lists.push({ id: row.listId, name: row.listName })
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
      })
    }
  }

  return Array.from(placesMap.values())
}

export async function getItemsForPlace(
  placeId: string
): Promise<Array<ItemSelect & { list: Pick<ListSelect, 'id' | 'name'> | null }>> {
  return db.query.item.findMany({
    where: and(eq(item.itemId, placeId), eq(item.itemType, 'PLACE')),
    with: {
      list: {
        columns: { id: true, name: true },
      },
    },
  })
}

export async function updatePlacePhotos(placeId: string, photos: string[]): Promise<void> {
  await db
    .update(place)
    .set({
      photos,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(place.id, placeId))
}

export async function listPlacesMissingPhotos(): Promise<PlaceSelect[]> {
  return db.query.place.findMany({
    where: and(isNotNull(place.googleMapsId), isNull(place.photos)),
  })
}

export async function refreshAllPlaces() {
  // Find all places missing photos (or other stale data)
  const places = await listPlacesMissingPhotos()
  let updatedCount = 0
  const errors: string[] = []

  for (const place of places) {
    try {
      // Fetch latest data from Google Maps API (stub: replace with actual API call)
      // Example: const googleData = await fetchGoogleMapsData(place.googleMapsId)
      const googleData = {
        googleMapsId: place.googleMapsId,
        name: place.name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        types: place.types,
        rating: place.rating,
        websiteUri: place.websiteUri,
        phoneNumber: place.phoneNumber,
        priceLevel: place.priceLevel,
        photos: place.photos ?? [],
        imageUrl: place.imageUrl ?? null,
        location: [place.longitude ?? 0, place.latitude ?? 0] as [number, number],
      }
      await ensurePlaceFromGoogleData(googleData)
      updatedCount++
    } catch (err) {
      errors.push(`Failed for ${place.id}: ${String(err)}`)
    }
  }

  return { updatedCount, errors }
}
