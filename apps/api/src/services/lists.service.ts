import { db } from '@hominem/utils/db'
import { item, list, place, userLists, users } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'

export interface User {
  id?: string
  email?: string
  name?: string
}

export interface List {
  id: string
  name: string
  description: string
  userId: string
  createdBy: User
  isOwnList?: boolean
  places: ListPlace[]
  isPublic?: boolean
  users?: User[]
  createdAt: string
  updatedAt: string
}

interface ListWithUser {
  list: typeof list.$inferSelect
  user: typeof users.$inferSelect | null
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
export async function getUserLists(userId: string) {
  try {
    return db
      .select()
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .leftJoin(list, eq(userLists.listId, list.id))
      .leftJoin(users, eq(list.userId, users.id))
      .orderBy(desc(list.createdAt))
  } catch (error) {
    console.error(`Error fetching shared lists for user ${userId}:`, error)
    return []
  }
}

/**
 * Get lists that are owned by the user
 */
export async function getOwnedLists(userId: string): Promise<ListWithUser[]> {
  try {
    return db
      .select({
        list,
        user: users,
      })
      .from(list)
      .where(eq(list.userId, userId))
      .leftJoin(users, eq(users.id, list.userId))
      .orderBy(desc(list.createdAt))
  } catch (error) {
    console.error(`Error fetching owned lists for user ${userId}:`, error)
    return []
  }
}

/**
 * Format a list with places to match the List interface
 */
export function formatList(listData: ListWithUser, places: ListPlace[], isOwn: boolean): List {
  return {
    id: listData.list.id,
    name: listData.list.name,
    description: listData.list.description || '',
    userId: listData.list.userId,
    createdBy: {
      id: listData.user?.id,
      email: listData.user?.email || '',
      name: listData.user?.name || '',
    },
    isOwnList: isOwn,
    places: places || [],
    isPublic: false, // Default to false if not specified
    createdAt: listData.list.createdAt,
    updatedAt: listData.list.updatedAt,
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
    // Process listIds in smaller batches if needed
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
