import crypto from 'node:crypto'
import { and, count, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { db, takeUniqueOrThrow } from '../db'
import {
  type Item as ItemSelect,
  item,
  type ListInviteSelect,
  type ListSelect,
  list,
  listInvite,
  place,
  type UserListsSelect,
  userLists,
  users,
} from '../db/schema'
import { logger } from '../logger'
import { sendInviteEmail } from '../resend'

export interface ListUser {
  id?: string
  email?: string
  name?: string
}

export interface ListWithSpreadOwner extends ListSelect {
  owner: { id: string; email: string; name: string | null } | null
  itemCount?: number
}

export interface List {
  id: string
  name: string
  description: string
  userId: string
  createdBy: { id: string; email: string; name: string | null } | null
  isOwnList?: boolean
  hasAccess?: boolean
  places: ListPlace[]
  isPublic: boolean
  users?: ListUser[]
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
  photos: string[] | null
  types: string[] | null
  type: string
  latitude: number | null
  longitude: number | null
  rating: number | null
  address: string | null
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
        photos: place.photos,
        types: place.types,
        type: item.type,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        address: place.address,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .where(eq(item.listId, listId))

    return listPlaces
  } catch (error) {
    logger.error('Error fetching places for list', {
      listId,
      error: error instanceof Error ? error.message : String(error),
    })
    return []
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
      .then((rows) => rows[0] ?? null)
  } catch (error) {
    logger.error('Error fetching first place for preview', {
      listId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

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
 * Format a list with places to match the List interface
 */
export function formatList(
  listData: ListWithSpreadOwner,
  places: ListPlace[],
  isOwn: boolean,
  hasAccess?: boolean
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
    hasAccess: hasAccess ?? isOwn,
    places: places || [],
    isPublic: listData.isPublic ?? false,
    createdAt: listData.createdAt,
    updatedAt: listData.updatedAt,
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
 * Builds a map of list places by listId for quick lookup
 * @param listIds - Array of list IDs to fetch places for
 * @returns Map of list places by listId
 */
export async function getListPlacesMap(listIds: string[]): Promise<Map<string, ListPlace[]>> {
  const placesMap = new Map<string, ListPlace[]>()

  if (listIds.length === 0) {
    return placesMap
  }

  try {
    const allPlaces = await db
      .select({
        id: item.id,
        itemId: item.itemId,
        listId: item.listId,
        description: place.description,
        itemAddedAt: item.createdAt,
        googleMapsId: place.googleMapsId,
        name: place.name,
        imageUrl: place.imageUrl,
        photos: place.photos,
        types: place.types,
        type: item.type,
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating,
        address: place.address,
      })
      .from(item)
      .innerJoin(place, eq(item.itemId, place.id))
      .where(inArray(item.listId, listIds))

    for (const p of allPlaces) {
      if (!placesMap.has(p.listId)) {
        placesMap.set(p.listId, [])
      }

      const listPlace: ListPlace = {
        id: p.id,
        itemId: p.itemId,
        description: p.description,
        itemAddedAt: p.itemAddedAt,
        googleMapsId: p.googleMapsId,
        name: p.name,
        imageUrl: p.imageUrl ?? p.photos?.[0] ?? null,
        photos: p.photos,
        types: p.types,
        type: p.type,
        latitude: p.latitude,
        longitude: p.longitude,
        rating: p.rating,
        address: p.address,
      }
      placesMap.get(p.listId)!.push(listPlace)
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

    return formatList(listDataForFormat, places, isOwnList, hasAccess)
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
    const start = Date.now()
    logger.info('[lists.service] createList start', { start, name, userId })

    const insertStart = Date.now()
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
    const insertEnd = Date.now()
    logger.info('[lists.service] createList insert done', {
      insertStart,
      insertEnd,
      durationMs: insertEnd - insertStart,
      name,
      userId,
    })

    const fetchStart = Date.now()
    const result = await getListById(rawCreatedList.id, userId)
    const fetchEnd = Date.now()
    logger.info('[lists.service] createList fetch done', {
      fetchStart,
      fetchEnd,
      durationMs: fetchEnd - fetchStart,
      name,
      userId,
    })

    const end = Date.now()
    logger.info('[lists.service] createList total duration', {
      start,
      end,
      durationMs: end - start,
      name,
      userId,
    })
    return result
  } catch (error) {
    logger.error('Failed to create list', {
      service: 'lists.service',
      function: 'createList',
      userId,
      input: { name },
      error: error instanceof Error ? error.message : String(error),
    })
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
export async function updateList(id: string, name: string) {
  try {
    const updatedList = await db
      .update(list)
      .set({ name })
      .where(eq(list.id, id))
      .returning()
      .then(takeUniqueOrThrow)
    return updatedList
  } catch (error) {
    console.error(`Error updating list ${id}:`, error)
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
 * @returns Array of list invites with user data for accepted invites
 */
export async function getListInvites(listId: string) {
  try {
    return await db.query.listInvite.findMany({
      where: eq(listInvite.listId, listId),
      with: {
        user_invitedUserId: true, // Include user data for accepted invites
      },
    })
  } catch (error) {
    console.error(`Error fetching invites for list ${listId}:`, error)
    return []
  }
}

export async function getListOwnedByUser(
  listId: string,
  userId: string
): Promise<ListSelect | undefined> {
  return db.query.list.findFirst({ where: and(eq(list.id, listId), eq(list.userId, userId)) })
}

export async function isUserMemberOfList(listId: string, userId: string): Promise<boolean> {
  const membership = await db.query.userLists.findFirst({
    where: and(eq(userLists.listId, listId), eq(userLists.userId, userId)),
  })
  return Boolean(membership)
}

export async function getInvitesForUser(userId: string, normalizedEmail?: string | null) {
  const ownershipClause = normalizedEmail
    ? or(eq(listInvite.invitedUserId, userId), eq(listInvite.invitedUserEmail, normalizedEmail))
    : eq(listInvite.invitedUserId, userId)

  return db.query.listInvite.findMany({
    where: ownershipClause,
    with: { list: true },
  })
}

export async function getInviteByToken(
  token: string
): Promise<(ListInviteSelect & { list: ListSelect | null }) | undefined> {
  return db.query.listInvite.findFirst({
    where: eq(listInvite.token, token),
    with: { list: true },
  })
}

export async function getInviteByListAndToken(params: { listId: string; token: string }) {
  const { listId, token } = params
  return db.query.listInvite.findFirst({
    where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
  })
}

export async function deleteInviteByListAndToken(params: { listId: string; token: string }) {
  const { listId, token } = params
  const deletedInvite = await db
    .delete(listInvite)
    .where(and(eq(listInvite.listId, listId), eq(listInvite.token, token)))
    .returning()

  return deletedInvite.length > 0
}

export async function getOutboundInvites(userId: string) {
  return db.query.listInvite.findMany({
    where: eq(listInvite.userId, userId),
    with: { list: true },
  })
}

export async function addItemToList(params: {
  listId: string
  itemId: string
  itemType: 'FLIGHT' | 'PLACE'
  userId: string
}) {
  const { listId, itemId, itemType, userId } = params

  const listItem = await getListOwnedByUser(listId, userId)
  if (!listItem) {
    throw new Error("List not found or you don't have permission to add items to it")
  }

  const existingItem = await db.query.item.findFirst({
    where: and(eq(item.listId, listId), eq(item.itemId, itemId)),
  })

  if (existingItem) {
    throw new Error('Item is already in this list')
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
    .returning()

  return newItem
}

export async function removeItemFromList(params: {
  listId: string
  itemId: string
  userId: string
}): Promise<boolean> {
  const { listId, itemId, userId } = params

  const listItem = await getListOwnedByUser(listId, userId)
  if (!listItem) {
    throw new Error("List not found or you don't have permission to remove items from it")
  }

  const deletedItem = await db
    .delete(item)
    .where(and(eq(item.listId, listId), eq(item.itemId, itemId)))
    .returning()

  return deletedItem.length > 0
}

export async function getItemsByListId(listId: string): Promise<ItemSelect[]> {
  return db.query.item.findMany({
    where: eq(item.listId, listId),
    orderBy: [desc(item.createdAt)],
  })
}

export async function getUserListLinks(listIds: string[]): Promise<UserListsSelect[]> {
  return db.query.userLists.findMany({
    where: inArray(userLists.listId, listIds),
  })
}

/**
 * Creates a new list invite.
 * @param listId - The ID of the list to invite to.
 * @param invitedUserEmail - The email of the user to invite.
 * @param invitingUserId - The ID of the user sending the invite.
 * @param baseUrl - The base URL for constructing the invite link.
 * @returns The created invite object or an error string.
 */
export async function sendListInvite(
  listId: string,
  invitedUserEmail: string,
  invitingUserId: string,
  baseUrl: string
): Promise<ListInviteSelect | { error: string; status: number }> {
  try {
    const normalizedInvitedEmail = invitedUserEmail.toLowerCase()
    const listRecord = await db.query.list.findFirst({
      where: eq(list.id, listId),
    })

    if (!listRecord) {
      return { error: 'List not found', status: 404 }
    }

    const existingInvite = await db.query.listInvite.findFirst({
      where: and(
        eq(listInvite.listId, listId),
        eq(listInvite.invitedUserEmail, normalizedInvitedEmail)
      ),
    })

    if (existingInvite) {
      return { error: 'An invite for this email address to this list already exists.', status: 409 }
    }

    const token = crypto.randomBytes(32).toString('hex')

    const invitedUserRecord = await db.query.users.findFirst({
      where: eq(users.email, normalizedInvitedEmail),
    })

    const createdInvite = await db
      .insert(listInvite)
      .values({
        listId: listId,
        invitedUserEmail: normalizedInvitedEmail,
        invitedUserId: invitedUserRecord?.id || null,
        accepted: false,
        userId: invitingUserId,
        token,
      })
      .returning()
      .then(takeUniqueOrThrow)

    const inviteLink = `${baseUrl.replace(/\/$/, '')}/invites?token=${token}&listId=${listId}`

    try {
      await sendInviteEmail({
        to: normalizedInvitedEmail,
        listName: listRecord.name,
        inviteLink,
      })
    } catch (error) {
      logger.error('Invite email failed to send', {
        listId,
        invitedUserEmail: normalizedInvitedEmail,
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return createdInvite
  } catch (error) {
    console.error(`Error creating list invite for list ${listId} by user ${invitingUserId}:`, error)
    if (
      error instanceof Error &&
      error.message.includes('duplicate key value violates unique constraint')
    ) {
      return { error: 'Invite already exists or conflicts with an existing record.', status: 409 }
    }
    return { error: 'Failed to create invite.', status: 500 }
  }
}

/**
 * Accepts a list invite.
 * @param listId - The ID of the list from the invite.
 * @param acceptingUserId - The ID of the user accepting the invite.
 * @param token - The invite token used for verification.
 * @returns The list object if successful, or an error string.
 */
export async function acceptListInvite(listId: string, acceptingUserId: string, token: string) {
  try {
    const invite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, listId), eq(listInvite.token, token)),
    })

    if (!invite) {
      return { error: 'Invite not found.', status: 404 }
    }

    if (invite.accepted) {
      return { error: 'Invite already accepted.', status: 400 }
    }

    const listRecord = await db.query.list.findFirst({
      where: eq(list.id, invite.listId),
    })

    if (!listRecord) {
      return { error: 'List not found.', status: 404 }
    }

    if (listRecord.userId === acceptingUserId) {
      return { error: 'Cannot accept an invite to a list you own.', status: 400 }
    }

    const acceptingUser = await db.query.users.findFirst({ where: eq(users.id, acceptingUserId) })
    if (!acceptingUser) {
      return { error: 'User account required to accept invite.', status: 404 }
    }

    const acceptedList = await db.transaction(async (tx) => {
      await tx
        .update(listInvite)
        .set({
          accepted: true,
          acceptedAt: new Date().toISOString(),
          invitedUserId: acceptingUserId,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(listInvite.listId, invite.listId), eq(listInvite.token, invite.token)))

      await tx
        .insert(userLists)
        .values({
          userId: acceptingUserId,
          listId: invite.listId,
        })
        .onConflictDoNothing()

      const l =
        listRecord ||
        (await tx.query.list.findFirst({
          where: eq(list.id, invite.listId),
        }))
      if (!l) throw new Error('List not found after accepting invite.')
      return l
    })

    return acceptedList
  } catch (error) {
    console.error(
      `Error accepting list invite for list ${listId} by user ${acceptingUserId}:`,
      error
    )
    return { error: 'Failed to accept invite.', status: 500 }
  }
}

/**
 * Deletes a pending invite for a list owned by the requesting user.
 */
export async function deleteListInvite({
  listId,
  invitedUserEmail,
  userId,
}: {
  listId: string
  invitedUserEmail: string
  userId: string
}) {
  try {
    const normalizedEmail = invitedUserEmail.toLowerCase()

    // Ensure the requester owns the list
    const listRecord = await db.query.list.findFirst({
      where: and(eq(list.id, listId), eq(list.userId, userId)),
    })

    if (!listRecord) {
      return { error: 'List not found or you do not own this list.', status: 403 }
    }

    const invite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)),
    })

    if (!invite) {
      return { error: 'Invite not found.', status: 404 }
    }

    if (invite.accepted) {
      return { error: 'Invite has already been accepted and cannot be deleted.', status: 400 }
    }

    await db
      .delete(listInvite)
      .where(and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, normalizedEmail)))

    return { success: true }
  } catch (error) {
    console.error(
      `Error deleting list invite for list ${listId} by user ${userId} for ${invitedUserEmail}:`,
      error
    )
    return { error: 'Failed to delete invite.', status: 500 }
  }
}

/**
 * Optimized function to get lists containing a specific place
 * Returns only essential fields: id, name, itemCount, imageUrl
 * Uses a highly optimized SQL query
 */
export async function getListsContainingPlace(
  userId: string,
  placeId?: string,
  googleMapsId?: string
): Promise<Array<{ id: string; name: string; itemCount: number; imageUrl: string | null }>> {
  if (!placeId && !googleMapsId) {
    return []
  }

  try {
    // First, find the place ID if we only have googleMapsId
    let resolvedPlaceId: string | null = null
    if (placeId) {
      resolvedPlaceId = placeId
    } else if (googleMapsId) {
      const foundPlace = await db.query.place.findFirst({
        where: eq(place.googleMapsId, googleMapsId),
        columns: { id: true },
      })
      resolvedPlaceId = foundPlace?.id || null
    }

    if (!resolvedPlaceId) {
      return []
    }

    // Step 1: Get lists that contain the place and user has access to
    const listsContainingPlace = await db
      .select({
        id: list.id,
        name: list.name,
      })
      .from(list)
      .innerJoin(item, and(eq(item.listId, list.id), eq(item.itemId, resolvedPlaceId)))
      .leftJoin(userLists, and(eq(userLists.listId, list.id), eq(userLists.userId, userId)))
      .where(
        and(eq(item.itemType, 'PLACE'), or(eq(list.userId, userId), isNotNull(userLists.listId)))
      )
      .groupBy(list.id, list.name)

    if (listsContainingPlace.length === 0) {
      return []
    }

    const listIds = listsContainingPlace.map((l) => l.id)

    // Step 2: Get item counts for each list (single query)
    const itemCounts = await db
      .select({
        listId: item.listId,
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
      .from(item)
      .where(and(inArray(item.listId, listIds), eq(item.itemType, 'PLACE')))
      .groupBy(item.listId)

    const countMap = new Map<string, number>()
    for (const row of itemCounts) {
      countMap.set(row.listId, Number(row.count))
    }

    // Step 3: Get thumbnail imageUrl for each list (prefer different place, fallback to any)
    // Get all places in these lists, then process in JS to get first image per list
    const allPlacesInLists = await db
      .select({
        listId: item.listId,
        placeId: place.id,
        imageUrl: place.imageUrl,
        photos: place.photos,
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
        imageMap.set(listId, preferredPlace.imageUrl || preferredPlace.photos?.[0] || null)
      }
    }

    // Combine results
    return listsContainingPlace.map((l) => ({
      id: l.id,
      name: l.name,
      itemCount: countMap.get(l.id) || 0,
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
