import crypto from 'node:crypto'
import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'
import { db } from '../db'
import {
  item,
  list,
  place,
  type Item as ItemSelect,
  type ListSelect,
  type Place as PlaceSelect,
} from '../db/schema'

export type ListSummary = { id: string; name: string }

type PlaceUpsertInput = {
  googleMapsId: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  types?: string[] | null
  imageUrl?: string | null
  websiteUri?: string | null
  phoneNumber?: string | null
  rating?: number | null
  priceLevel?: number | null
  photos?: string[] | null
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

export async function getPlaceById(id: string): Promise<PlaceSelect | undefined> {
  return db.query.place.findFirst({ where: eq(place.id, id) })
}

export async function getPlaceByGoogleMapsId(
  googleMapsId: string
): Promise<PlaceSelect | undefined> {
  return db.query.place.findFirst({ where: eq(place.googleMapsId, googleMapsId) })
}

export async function ensurePlaceFromGoogleData(data: PlaceUpsertInput): Promise<PlaceSelect> {
  const existing = await getPlaceByGoogleMapsId(data.googleMapsId)
  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(place)
    .values({
      id: crypto.randomUUID(),
      ...data,
      address: data.address ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      types: data.types ?? null,
      imageUrl: data.imageUrl ?? null,
      websiteUri: data.websiteUri ?? null,
      phoneNumber: data.phoneNumber ?? null,
      rating: data.rating ?? null,
      priceLevel: data.priceLevel ?? null,
      photos: data.photos ?? null,
      location: toLocationTuple(data.latitude, data.longitude),
    })
    .returning()

  if (!created) {
    throw new Error('Failed to create place')
  }

  return created
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

  return updated
}

export async function deletePlaceById(id: string): Promise<boolean> {
  const result = await db.delete(place).where(eq(place.id, id)).returning({ id: place.id })
  return result.length > 0
}

export async function addPlaceToLists(
  userId: string,
  listIds: string[],
  placeInput: PlaceUpsertInput
) {
  return db.transaction(async (tx) => {
    const placeRecord = await ensurePlaceFromGoogleData(placeInput)

    const itemInsertValues = listIds.map((listId) => ({
      listId,
      itemId: placeRecord.id,
      userId,
      type: 'PLACE' as const,
      itemType: 'PLACE' as const,
      id: crypto.randomUUID(),
    }))

    if (itemInsertValues.length > 0) {
      await tx.insert(item).values(itemInsertValues).onConflictDoNothing()
    }

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
      imageUrl: place.imageUrl,
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
