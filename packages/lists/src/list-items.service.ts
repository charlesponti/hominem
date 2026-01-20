import { db } from '@hominem/db';
import { type Item as ItemSelect, item, list, place, userLists, users } from '@hominem/db/schema';
import { getHominemPhotoURL } from '@hominem/utils/images';
import { logger } from '@hominem/utils/logger';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import crypto from 'node:crypto';

import type { ListPlace } from './types';

import { getListOwnedByUser } from './list-queries.service';

/**
 * Fetches all places associated with a specific list
 * @param listId - The ID of the list to fetch places for
 * @returns Array of places associated with the list
 */
export async function getListPlaces(listId: string): Promise<ListPlace[]> {
  try {
    const listPlaces = await db
      .select({
        id: item.id,
        placeId: item.itemId, // Map item.itemId (which is place.id) to placeId for clarity
        description: place.description,
        itemAddedAt: item.createdAt,
        googleMapsId: place.googleMapsId,
        name: place.name,
        imageUrl: sql<string | null>`COALESCE(${place.imageUrl}, ${place.photos}[1])`.as(
          'imageUrl',
        ),
        photos: place.photos,
        types: place.types,
        type: item.type,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        address: place.address,
        addedById: users.id,
        addedByName: users.name,
        addedByEmail: users.email,
        addedByImage: users.image,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .innerJoin(users, eq(item.userId, users.id))
      .where(eq(item.listId, listId));

    return listPlaces.map((p) => ({
      id: p.id,
      placeId: p.placeId,
      description: p.description,
      itemAddedAt: p.itemAddedAt,
      googleMapsId: p.googleMapsId,
      name: p.name,
      imageUrl: p.imageUrl,
      photos: p.photos,
      types: p.types,
      type: p.type,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating,
      address: p.address,
      addedBy: {
        id: p.addedById,
        name: p.addedByName,
        email: p.addedByEmail,
        image: p.addedByImage,
      },
    }));
  } catch (error) {
    logger.error('Error fetching places for list', {
      listId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Gets the first place in a list for preview purposes.
 * Optimized to fetch only one place, preferring one with an image.
 * Only fetches minimal fields needed for preview.
 */
export async function getPlaceListPreview(listId: string) {
  try {
    return await db
      .select({
        itemId: item.itemId,
        name: place.name,
        description: place.description,
        imageUrl: place.imageUrl,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .where(eq(item.listId, listId))
      .limit(1)
      .then((rows) => {
        const r = rows[0] ?? null;
        if (!r) {
          return null;
        }
        const photoUrl = r.imageUrl ? getHominemPhotoURL(r.imageUrl, 600, 400) : null;
        return { ...r, photoUrl };
      });
  } catch (error) {
    logger.error('Error fetching first place for preview', {
      listId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Builds a map of list places by listId for quick lookup
 * @param listIds - Array of list IDs to fetch places for
 * @returns Map of list places by listId
 */
export async function getListPlacesMap(listIds: string[]): Promise<Map<string, ListPlace[]>> {
  const placesMap = new Map<string, ListPlace[]>();

  if (listIds.length === 0) {
    return placesMap;
  }

  try {
    const allPlaces = await db
      .select({
        id: item.id,
        placeId: item.itemId, // Map item.itemId (which is place.id) to placeId for clarity
        listId: item.listId,
        description: place.description,
        itemAddedAt: item.createdAt,
        googleMapsId: place.googleMapsId,
        name: place.name,
        imageUrl: sql<string | null>`COALESCE(${place.imageUrl}, ${place.photos}[1])`.as(
          'imageUrl',
        ),
        photos: place.photos,
        types: place.types,
        type: item.type,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        address: place.address,
        addedById: users.id,
        addedByName: users.name,
        addedByEmail: users.email,
        addedByImage: users.image,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .innerJoin(users, eq(item.userId, users.id))
      .where(inArray(item.listId, listIds));

    for (const p of allPlaces) {
      if (!placesMap.has(p.listId)) {
        placesMap.set(p.listId, []);
      }

      const listPlace: ListPlace = {
        id: p.id,
        placeId: p.placeId,
        description: p.description,
        itemAddedAt: p.itemAddedAt,
        googleMapsId: p.googleMapsId,
        name: p.name,
        imageUrl: p.imageUrl,
        photos: p.photos,
        types: p.types,
        type: p.type,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        address: p.address,
        addedBy: {
          id: p.addedById,
          name: p.addedByName,
          email: p.addedByEmail,
          image: p.addedByImage,
        },
      };
      placesMap.get(p.listId)!.push(listPlace);
    }

    return placesMap;
  } catch (error) {
    console.error('Error building list places map:', error);
    return placesMap;
  }
}

/**
 * Deletes an item from a list
 * @param listId - The ID of the list
 * @param itemId - The ID of the item to delete
 * @param userId - The ID of the user performing the deletion (must be owner or collaborator)
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteListItem(
  listId: string,
  itemId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Use a subquery to check if user has access (owner or collaborator)
    // Only delete if the user has access to the list
    // The subquery checks if the list is owned by the user OR the user is a collaborator
    const result = await db
      .delete(item)
      .where(
        and(
          eq(item.listId, listId),
          eq(item.itemId, itemId),
          sql`EXISTS (
            SELECT 1 FROM ${list}
            WHERE ${list.id} = ${item.listId}
            AND (
              ${list.userId} = ${userId}
              OR EXISTS (
                SELECT 1 FROM ${userLists}
                WHERE ${userLists.listId} = ${list.id}
                AND ${userLists.userId} = ${userId}
              )
            )
          )`,
        ),
      )
      .returning({ id: item.id });
    return result.length > 0;
  } catch (error) {
    console.error(`Error deleting item ${itemId} from list ${listId} for user ${userId}:`, error);
    return false;
  }
}

export async function addItemToList(params: {
  listId: string;
  itemId: string;
  itemType: 'FLIGHT' | 'PLACE';
  userId: string;
}) {
  const { listId, itemId, itemType, userId } = params;

  const listItem = await getListOwnedByUser(listId, userId);
  if (!listItem) {
    throw new Error("List not found or you don't have permission to add items to it");
  }

  const existingItem = await db.query.item.findFirst({
    where: and(eq(item.listId, listId), eq(item.itemId, itemId)),
  });

  if (existingItem) {
    throw new Error('Item is already in this list');
  }

  const [newItem] = await db
    .insert(item)
    .values({
      id: crypto.randomUUID(),
      listId,
      itemId,
      itemType,
      userId,
      type: itemType,
    })
    .returning();

  return newItem;
}

export async function removeItemFromList(params: {
  listId: string;
  itemId: string;
  userId: string;
}): Promise<boolean> {
  const { listId, itemId, userId } = params;

  const listItem = await getListOwnedByUser(listId, userId);
  if (!listItem) {
    throw new Error("List not found or you don't have permission to remove items from it");
  }

  const deletedItem = await db
    .delete(item)
    .where(and(eq(item.listId, listId), eq(item.itemId, itemId)))
    .returning();

  return deletedItem.length > 0;
}

export async function getItemsByListId(listId: string): Promise<ItemSelect[]> {
  return db.query.item.findMany({
    where: eq(item.listId, listId),
    orderBy: [desc(item.createdAt)],
  });
}
