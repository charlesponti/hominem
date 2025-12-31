import { and, count, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { db } from '../../db'
import { item, type ListSelect, list, place, userLists, users } from '../../db/schema'
import { logger } from '../../logger'
import { formatList } from './list-crud.service'
import { getListPlaces, getListPlacesMap } from './list-items.service'
import type { List, ListUser, ListWithSpreadOwner } from './types'

/**
 * Get lists that the user is explicitly a member of (shared with them)
 */
export async function getUserLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    type SharedListDbResultBase = {
      id: string
      name: string
      description: string | null
      userId: string
      isPublic: boolean
      createdAt: string
      updatedAt: string
      owner_id: string | null
      owner_email: string | null
      owner_name: string | null
    }

    const baseSelect = {
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
    }

    const query = db
      .select(baseSelect)
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .innerJoin(list, eq(userLists.listId, list.id))
      .innerJoin(users, eq(list.userId, users.id))
    const results = (await query.orderBy(desc(list.createdAt))) as SharedListDbResultBase[]

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

      const listItem: ListWithSpreadOwner = {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }

      return listItem
    })
  } catch (error) {
    logger.error('Error fetching shared lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Fetch shared lists for a user and include item counts (optionally filtered by itemType)
 */
export async function getUserListsWithItemCount(
  userId: string,
  itemType?: string
): Promise<ListWithSpreadOwner[]> {
  try {
    const baseSelect = {
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
    }

    const selectFields = { ...baseSelect, itemCount: count(item.id) }

    const query = db
      .select(selectFields)
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .innerJoin(list, eq(userLists.listId, list.id))
      .leftJoin(
        item,
        and(eq(userLists.listId, item.listId), itemType ? eq(item.type, itemType) : undefined)
      )
      .innerJoin(users, eq(list.userId, users.id))
      .groupBy(
        list.id,
        list.name,
        list.description,
        list.userId,
        list.isPublic,
        list.createdAt,
        list.updatedAt,
        users.id,
        users.email,
        users.name
      )

    const results = await query.orderBy(desc(list.createdAt))

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

      const listItem: ListWithSpreadOwner = {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }

      if (item.itemCount !== null) {
        listItem.itemCount = Number(item.itemCount)
      }

      return listItem
    })
  } catch (error) {
    logger.error('Error fetching shared lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Get lists that are owned by the user
 */
export async function getOwnedLists(userId: string): Promise<ListWithSpreadOwner[]> {
  try {
    // Lightweight: no item join / no item counts

    type OwnedListDbResultBase = {
      id: string
      name: string
      description: string | null
      userId: string
      isPublic: boolean
      createdAt: string
      updatedAt: string
      owner_id: string | null
      owner_email: string | null
      owner_name: string | null
    }

    const baseSelect = {
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
    }

    const query = db
      .select(baseSelect)
      .from(list)
      .where(eq(list.userId, userId))
      .innerJoin(users, eq(users.id, list.userId))
    const queryResults = (await query.orderBy(desc(list.createdAt))) as OwnedListDbResultBase[]

    return queryResults.map((dbItem) => {
      const listPart = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        userId: dbItem.userId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      }
      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null

      const listItem: ListWithSpreadOwner = {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }

      // No item counts in the lightweight metadata response

      return listItem
    })
  } catch (error) {
    logger.error('Error fetching owned lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Fetch owned lists for a user and include item counts (optionally filtered by itemType)
 */
export async function getOwnedListsWithItemCount(
  userId: string,
  itemType?: string
): Promise<ListWithSpreadOwner[]> {
  try {
    type OwnedListDbResultBase = {
      id: string
      name: string
      description: string | null
      userId: string
      isPublic: boolean
      createdAt: string
      updatedAt: string
      owner_id: string | null
      owner_email: string | null
      owner_name: string | null
    }
    type OwnedListDbResultWithCount = OwnedListDbResultBase & { itemCount: string | null }
    type OwnedListDbResult = OwnedListDbResultBase | OwnedListDbResultWithCount

    const baseSelect = {
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
    }

    const selectFields = { ...baseSelect, itemCount: count(item.id) }

    const query = db
      .select(selectFields)
      .from(list)
      .where(eq(list.userId, userId))
      .innerJoin(users, eq(users.id, list.userId))
      .leftJoin(item, and(eq(item.listId, list.id), itemType ? eq(item.type, itemType) : undefined))
      .groupBy(
        list.id,
        list.name,
        list.description,
        list.userId,
        list.isPublic,
        list.createdAt,
        list.updatedAt,
        users.id,
        users.email,
        users.name
      )

    const queryResults = (await query.orderBy(desc(list.createdAt))) as OwnedListDbResult[]

    return queryResults.map((dbItem) => {
      const listPart = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        userId: dbItem.userId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      }
      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null

      const listItem: ListWithSpreadOwner = {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }

      if ('itemCount' in dbItem && dbItem.itemCount !== null) {
        listItem.itemCount = Number(dbItem.itemCount)
      }

      return listItem
    })
  } catch (error) {
    logger.error('Error fetching owned lists for user', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Optimized function to get all lists (owned + shared) with their places in a single SQL query
 * Uses a single query with LEFT JOIN to get all accessible lists, then fetches places in one query
 * @param userId - The ID of the user
 * @returns Object containing ownedListsWithPlaces and sharedListsWithPlaces
 */
export async function getAllUserListsWithPlaces(userId: string): Promise<{
  ownedListsWithPlaces: List[]
  sharedListsWithPlaces: List[]
}> {
  try {
    // Single query to get all lists the user has access to (owned OR shared)
    // Uses LEFT JOIN to userLists to identify shared lists, then filters for owned or shared
    const allLists = await db
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
        isOwned: sql<boolean>`${list.userId} = ${userId}`.as('isOwned'),
        userLists_userId: userLists.userId,
      })
      .from(list)
      .innerJoin(users, eq(users.id, list.userId))
      .leftJoin(userLists, and(eq(userLists.listId, list.id), eq(userLists.userId, userId)))
      .where(
        or(
          eq(list.userId, userId), // Owned lists
          isNotNull(userLists.listId) // Shared lists (join matched)
        )
      )
      .orderBy(desc(list.createdAt))

    if (allLists.length === 0) {
      return {
        ownedListsWithPlaces: [],
        sharedListsWithPlaces: [],
      }
    }

    // Deduplicate lists (a list could appear twice if user owns it AND it's shared)
    const uniqueLists = new Map<string, (typeof allLists)[0]>()
    for (const dbItem of allLists) {
      if (!uniqueLists.has(dbItem.id)) {
        uniqueLists.set(dbItem.id, dbItem)
      } else {
        // If already exists, prefer owned status
        const existing = uniqueLists.get(dbItem.id)!
        if (dbItem.isOwned && !existing.isOwned) {
          uniqueLists.set(dbItem.id, dbItem)
        }
      }
    }

    const listIds = Array.from(uniqueLists.keys())
    const placesMap = await getListPlacesMap(listIds)

    const ownedLists: List[] = []
    const sharedLists: List[] = []

    for (const dbItem of uniqueLists.values()) {
      const listPart = {
        id: dbItem.id,
        name: dbItem.name,
        description: dbItem.description,
        userId: dbItem.userId,
        isPublic: dbItem.isPublic,
        createdAt: dbItem.createdAt,
        updatedAt: dbItem.updatedAt,
      }

      const ownerPart = dbItem.owner_id
        ? {
            id: dbItem.owner_id,
            email: dbItem.owner_email as string,
            name: dbItem.owner_name,
          }
        : null

      const listData: ListWithSpreadOwner = {
        ...(listPart as ListSelect),
        owner: ownerPart,
      }

      const places = placesMap.get(dbItem.id) || []

      if (dbItem.isOwned) {
        ownedLists.push(formatList(listData, places, true, true))
      } else {
        sharedLists.push(formatList(listData, places, false, true))
      }
    }

    return {
      ownedListsWithPlaces: ownedLists,
      sharedListsWithPlaces: sharedLists,
    }
  } catch (error) {
    logger.error('Error fetching all user lists with places', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      ownedListsWithPlaces: [],
      sharedListsWithPlaces: [],
    }
  }
}

/**
 * Get a single list by ID with all its places
 * @param id - The ID of the list to fetch
 * @returns The list with its places or null if not found
 */
export async function getListById(id: string, userId?: string | null) {
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
        owner_image: users.image,
      })
      .from(list)
      .where(eq(list.id, id))
      .innerJoin(users, eq(users.id, list.userId))
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

    const isOwnList = listDataForFormat.userId === userId
    let hasAccess = isOwnList

    if (!hasAccess && userId) {
      const sharedAccess = await db.query.userLists.findFirst({
        where: and(eq(userLists.listId, id), eq(userLists.userId, userId)),
      })
      hasAccess = Boolean(sharedAccess)
    }

    // Efficiently fetch all collaborators (users who have access to this list) with their avatars
    // This includes users in userLists, excluding the owner (who we already have)
    const collaborators = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
      })
      .from(userLists)
      .innerJoin(users, eq(users.id, userLists.userId))
      .where(eq(userLists.listId, id))
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name || undefined,
          image: row.image || undefined,
        }))
      )

    // Always include the owner as the first collaborator
    const allCollaborators: ListUser[] = []
    if (result.owner_id) {
      allCollaborators.push({
        id: result.owner_id,
        email: result.owner_email as string,
        name: result.owner_name || undefined,
        image: result.owner_image || undefined,
      })
    }
    // Add other collaborators (excluding owner if they're also in userLists)
    for (const collaborator of collaborators) {
      if (collaborator.id !== result.owner_id) {
        allCollaborators.push(collaborator)
      }
    }

    return formatList(listDataForFormat, places, isOwnList, hasAccess, allCollaborators)
  } catch (error) {
    console.error(`Error fetching list ${id}:`, error)
    return null
  }
}

export async function getListOwnedByUser(
  listId: string,
  userId: string
): Promise<ListSelect | undefined> {
  return db.query.list.findFirst({ where: and(eq(list.id, listId), eq(list.userId, userId)) })
}

export async function getListsContainingPlace(
  userId: string,
  placeId?: string,
  googleMapsId?: string
): Promise<Array<{ id: string; name: string; itemCount: number; imageUrl: string | null }>> {
  if (!placeId && !googleMapsId) {
    return []
  }

  try {
    // Combined query: resolve placeId and get lists in one go
    const listsContainingPlace = await db
      .select({
        id: list.id,
        name: list.name,
        resolvedPlaceId: place.id,
        itemCount: sql<number>`
          (SELECT COUNT(*)::int
           FROM ${item} i
           WHERE i."listId" = ${list.id}
           AND i."itemType" = 'PLACE')
        `.as('itemCount'),
      })
      .from(list)
      .innerJoin(item, eq(item.listId, list.id))
      .innerJoin(
        place,
        and(
          eq(place.id, item.itemId),
          placeId
            ? eq(place.id, placeId)
            : googleMapsId
              ? eq(place.googleMapsId, googleMapsId)
              : sql`false`
        )
      )
      .leftJoin(userLists, and(eq(userLists.listId, list.id), eq(userLists.userId, userId)))
      .where(
        and(eq(item.itemType, 'PLACE'), or(eq(list.userId, userId), isNotNull(userLists.listId)))
      )
      .groupBy(list.id, list.name, place.id)

    if (listsContainingPlace.length === 0) {
      return []
    }

    const listIds = listsContainingPlace.map((l) => l.id)
    const resolvedPlaceId = listsContainingPlace[0]?.resolvedPlaceId

    // Get thumbnail imageUrl for each list (prefer different place, fallback to any)
    const allPlacesInLists = await db
      .select({
        listId: item.listId,
        placeId: place.id,
        imageUrl: sql<string | null>`COALESCE(${place.imageUrl}, ${place.photos}[1])`.as(
          'imageUrl'
        ),
        createdAt: item.createdAt,
      })
      .from(item)
      .innerJoin(place, eq(place.id, item.itemId))
      .where(and(inArray(item.listId, listIds), eq(item.itemType, 'PLACE')))
      .orderBy(item.listId, item.createdAt)

    const imageMap = new Map<string, string | null>()
    for (const listId of listIds) {
      const placesInList = allPlacesInLists.filter((p) => p.listId === listId)
      // Prefer a place that's not the current one
      const preferredPlace =
        placesInList.find((p) => p.placeId !== resolvedPlaceId) || placesInList[0]
      if (preferredPlace) {
        imageMap.set(listId, preferredPlace.imageUrl)
      }
    }

    // Combine results
    return listsContainingPlace.map((l) => ({
      id: l.id,
      name: l.name,
      itemCount: Number(l.itemCount),
      imageUrl: imageMap.get(l.id) || null,
    }))
  } catch (error) {
    logger.error('Error fetching lists containing place', {
      userId,
      placeId,
      googleMapsId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}
