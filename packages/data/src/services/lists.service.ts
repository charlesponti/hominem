import { and, count, desc, eq } from 'drizzle-orm'
import { db, takeUniqueOrThrow } from '../db'
import {
  item,
  type ListInviteSelect,
  type ListSelect,
  list,
  listInvite,
  place,
  userLists,
  users,
} from '../db/schema'

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
export async function getUserLists(
  userId: string,
  itemType?: string
): Promise<ListWithSpreadOwner[]> {
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
        itemCount: count(item.id),
      })
      .from(userLists)
      .where(eq(userLists.userId, userId))
      .leftJoin(list, eq(userLists.listId, list.id))
      .leftJoin(
        item,
        and(eq(userLists.listId, item.listId), itemType ? eq(item.type, itemType) : undefined)
      )
      .leftJoin(users, eq(list.userId, users.id))
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
    console.error(`Error fetching shared lists for user ${userId}:`, error)
    return []
  }
}

/**
 * Get lists that are owned by the user
 */
export async function getOwnedLists(
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
    type OwnedListDbResultWithCount = OwnedListDbResultBase & { itemCount: string }
    type OwnedListDbResult = OwnedListDbResultBase | OwnedListDbResultWithCount

    let queryResults: OwnedListDbResult[]

    if (itemType) {
      queryResults = await db
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
          itemCount: count(item.id),
        })
        .from(list)
        .where(eq(list.userId, userId))
        .leftJoin(users, eq(users.id, list.userId))
        .leftJoin(item, and(eq(item.listId, list.id), eq(item.type, itemType)))
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
        .orderBy(desc(list.createdAt))
    } else {
      queryResults = await db
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
    }

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
    console.error(
      JSON.stringify(
        {
          message: 'Failed to create list',
          service: 'lists.service',
          function: 'createList',
          userId,
          input: { name },
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    )
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
export async function getListInvites(listId: string): Promise<Array<ListInviteSelect>> {
  try {
    return await db.select().from(listInvite).where(eq(listInvite.listId, listId))
  } catch (error) {
    console.error(`Error fetching invites for list ${listId}:`, error)
    return []
  }
}

/**
 * Creates a new list invite.
 * @param listId - The ID of the list to invite to.
 * @param invitedUserEmail - The email of the user to invite.
 * @param invitingUserId - The ID of the user sending the invite.
 * @returns The created invite object or an error string.
 */
export async function sendListInvite(
  listId: string,
  invitedUserEmail: string,
  invitingUserId: string
): Promise<ListInviteSelect | { error: string; status: number }> {
  try {
    const listRecord = await db.query.list.findFirst({
      where: eq(list.id, listId),
    })

    if (!listRecord) {
      return { error: 'List not found', status: 404 }
    }

    const existingInvite = await db.query.listInvite.findFirst({
      where: and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, invitedUserEmail)),
    })

    if (existingInvite) {
      return { error: 'An invite for this email address to this list already exists.', status: 409 }
    }

    const invitedUserRecord = await db.query.users.findFirst({
      where: eq(users.email, invitedUserEmail),
    })

    const createdInvite = await db
      .insert(listInvite)
      .values({
        listId: listId,
        invitedUserEmail: invitedUserEmail,
        invitedUserId: invitedUserRecord?.id || null,
        accepted: false,
        userId: invitingUserId,
      })
      .returning()
      .then(takeUniqueOrThrow)
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
 * @param acceptingUserEmail - The email of the user accepting the invite.
 * @returns The list object if successful, or an error string.
 */
export async function acceptListInvite(
  listId: string,
  acceptingUserId: string,
  acceptingUserEmail: string
): Promise<ListSelect | { error: string; status: number }> {
  try {
    const invite = await db.query.listInvite.findFirst({
      where: and(
        eq(listInvite.listId, listId),
        eq(listInvite.invitedUserEmail, acceptingUserEmail)
      ),
    })

    if (!invite) {
      return { error: 'Invite not found.', status: 404 }
    }

    if (invite.accepted) {
      return { error: 'Invite already accepted.', status: 400 }
    }

    if (invite.invitedUserEmail !== acceptingUserEmail) {
      return { error: 'Forbidden.', status: 403 }
    }

    const acceptedList = await db.transaction(async (tx) => {
      await tx
        .update(listInvite)
        .set({ accepted: true, acceptedAt: new Date().toISOString() })
        .where(
          and(
            eq(listInvite.listId, invite.listId),
            eq(listInvite.invitedUserEmail, invite.invitedUserEmail)
          )
        )

      await tx
        .insert(userLists)
        .values({
          userId: acceptingUserId,
          listId: invite.listId,
        })
        .onConflictDoNothing()

      const l = await tx.query.list.findFirst({
        where: eq(list.id, invite.listId),
      })
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
