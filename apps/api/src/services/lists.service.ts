import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import {
  item,
  list,
  listInvite,
  place,
  userLists,
  users,
  type ListSelect,
} from '@hominem/utils/schema'
import { and, desc, eq } from 'drizzle-orm'

export interface User {
  id?: string
  email?: string
  name?: string
}

export interface ListWithSpreadOwner extends ListSelect {
  owner: { id: string; email: string; name: string | null } | null
}

export interface List {
  id: string
  name: string
  description: string
  userId: string
  createdBy: { id: string; email: string; name: string | null } | null
  isOwnList?: boolean
  places: ListPlace[]
  isPublic: boolean
  users?: User[]
  createdAt: string
  updatedAt: string
}

/**
 * Type definition for list places
 */
export interface ListPlace {
  id: string
  itemId: string
  description: string | null
  itemAddedAt: string
  googleMapsId: string | null
  name: string
  imageUrl: string | null
  types: string[] | null
  type: string
}

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
        itemId: item.itemId,
        description: place.description,
        itemAddedAt: item.createdAt,
        googleMapsId: place.googleMapsId,
        name: place.name,
        imageUrl: place.imageUrl,
        types: place.types,
        type: item.type,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .where(eq(item.listId, listId))

    return listPlaces
  } catch (error) {
    console.error(`Error fetching places for list ${listId}:`, error)
    return []
  }
}

/**
 * Get lists that the user is explicitly a member of (shared with them)
 */
export async function getUserLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    const results = await db
      .select({
        id: list.id,
        name: list.name,
        description: list.description,
        userId: list.userId,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        owner_id: users.id,
        owner_email: users.email,
        owner_name: users.name,
      })
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .leftJoin(list, eq(userLists.listId, list.id))
      .leftJoin(users, eq(list.userId, users.id))
      .orderBy(desc(list.createdAt))

    return results
      .filter((item) => item.id !== null)
      .map((item) => {
        const listPart = {
          id: item.id as string,
          name: item.name as string,
          description: item.description,
          userId: item.userId as string,
          isPublic: item.isPublic,
          createdAt: item.createdAt as string,
          updatedAt: item.updatedAt as string,
        }

        const ownerPart = item.owner_id
          ? {
              id: item.owner_id,
              email: item.owner_email as string,
              name: item.owner_name,
            }
          : null

        return {
          ...(listPart as ListSelect),
          owner: ownerPart,
        }
      })
  } catch (error) {
    console.error(`Error fetching shared lists for user ${userId}:`, error)
    return []
  }
}

/**
 * Get lists that are owned by the user
 */
export async function getOwnedLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    const results = await db
      .select({
        id: list.id,
        name: list.name,
        description: list.description,
        userId: list.userId,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        owner_id: users.id,
        owner_email: users.email,
        owner_name: users.name,
      })
      .from(list)
      .where(eq(list.userId, userId))
      .leftJoin(users, eq(users.id, list.userId))
      .orderBy(desc(list.createdAt))

    return results.map((item) => {
      const listPart = {
        id: item.id,
        name: item.name,
        description: item.description,
        userId: item.userId,
        isPublic: item.isPublic,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
      const ownerPart = item.owner_id
        ? {
            id: item.owner_id,
            email: item.owner_email as string,
            name: item.owner_name,
          }
        : null

      return {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }
    })
  } catch (error) {
    console.error(`Error fetching owned lists for user ${userId}:`, error)
    return []
  }
}

/**
 * Format a list with places to match the List interface
 */
export function formatList(
  listData: ListWithSpreadOwner,
  places: ListPlace[],
  isOwn: boolean
): List {
  return {
    id: listData.id,
    name: listData.name,
    description: listData.description || '',
    userId: listData.userId,
    createdBy: listData.owner
      ? {
          id: listData.owner.id,
          email: listData.owner.email,
          name: listData.owner.name || null,
        }
      : null,
    isOwnList: isOwn,
    places: places || [],
    isPublic: listData.isPublic ?? false,
    createdAt: listData.createdAt,
    updatedAt: listData.updatedAt,
  }
}

/**
 * Builds a map of list places by listId for quick lookup
 * @param listIds - Array of list IDs to fetch places for
 * @returns Map of list places by listId
 */
export async function getListPlacesMap(listIds: string[]): Promise<Map<string, ListPlace[]>> {
  const placesMap = new Map<string, ListPlace[]>()

  try {
    for (const listId of listIds) {
      const places = await getListPlaces(listId)
      placesMap.set(listId, places)
    }

    return placesMap
  } catch (error) {
    console.error('Error building list places map:', error)
    return placesMap
  }
}

/**
 * Get a single list by ID with all its places
 * @param id - The ID of the list to fetch
 * @returns The list with its places or null if not found
 */
export async function getListById(id: string, userId?: string | null): Promise<List | null> {
  try {
    const result = await db
      .select({
        id: list.id,
        name: list.name,
        description: list.description,
        userId: list.userId,
        isPublic: list.isPublic,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        owner_id: users.id,
        owner_email: users.email,
        owner_name: users.name,
      })
      .from(list)
      .where(eq(list.id, id))
      .leftJoin(users, eq(users.id, list.userId))
      .then((rows) => rows[0])

    if (!result) {
      return null
    }

    const listPart = {
      id: result.id,
      name: result.name,
      description: result.description,
      userId: result.userId,
      isPublic: result.isPublic,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }

    const ownerPart = result.owner_id
      ? {
          id: result.owner_id,
          email: result.owner_email as string,
          name: result.owner_name,
        }
      : null

    const listDataForFormat: ListWithSpreadOwner = {
      ...(listPart as ListSelect),
      owner: ownerPart,
    }

    const places = await getListPlaces(id)
    return formatList(listDataForFormat, places, listDataForFormat.userId === userId)
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error)
    return null
  }
}

/**
 * Creates a new list
 * @param name - The name of the list
 * @param userId - The ID of the user creating the list
 * @returns The created list object or null if creation failed
 */
export async function createList(name: string, userId: string): Promise<List | null> {
  try {
    const rawCreatedList = await db
      .insert(list)
      .values({
        id: crypto.randomUUID(),
        name,
        userId,
        // description and isPublic will use DB defaults or be null
      })
      .returning()
      .then(takeUniqueOrThrow)

    // Fetch the newly created list with all necessary details for formatting
    return getListById(rawCreatedList.id, userId)
  } catch (error) {
    console.error(`Error creating list for user ${userId}:`, error)
    return null
  }
}

/**
 * Updates an existing list
 * @param id - The ID of the list to update
 * @param name - The new name for the list
 * @param userId - The ID of the user performing the update (for fetching formatted list)
 * @returns The updated list object or null if update failed or list not found
 */
export async function updateList(id: string, name: string, userId: string): Promise<List | null> {
  try {
    await db.update(list).set({ name }).where(eq(list.id, id)).returning().then(takeUniqueOrThrow) // Ensures list existed and was updated

    // Fetch the updated list with all necessary details
    return getListById(id, userId)
  } catch (error) {
    console.error(`Error updating list ${id}:`, error)
    // Could be an error from DB or if takeUniqueOrThrow failed (e.g. list not found)
    return null
  }
}

/**
 * Deletes a list
 * @param id - The ID of the list to delete
 * @param userId - The ID of the user performing the deletion (for authorization, though not used in this query)
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteList(id: string, userId: string): Promise<boolean> {
  try {
    const result = await db.delete(list).where(eq(list.id, id)).returning({ id: list.id })
    return result.length > 0 // Check if any row was actually deleted
  } catch (error) {
    console.error(`Error deleting list ${id} for user ${userId}:`, error)
    return false
  }
}

/**
 * Deletes an item from a list
 * @param listId - The ID of the list
 * @param itemId - The ID of the item to delete
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteListItem(listId: string, itemId: string): Promise<boolean> {
  try {
    const result = await db
      .delete(item)
      .where(and(eq(item.listId, listId), eq(item.itemId, itemId)))
      .returning({ id: item.id })
    return result.length > 0
  } catch (error) {
    console.error(`Error deleting item ${itemId} from list ${listId}:`, error)
    return false
  }
}

/**
 * Gets all invites for a specific list
 * @param listId - The ID of the list
 * @returns Array of list invites
 */
export async function getListInvites(
  listId: string
): Promise<Array<typeof listInvite.$inferSelect>> {
  try {
    return await db.select().from(listInvite).where(eq(listInvite.listId, listId))
  } catch (error) {
    console.error(`Error fetching invites for list ${listId}:`, error)
    return []
  }
}
