import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, takeUniqueOrThrow } from '../../db'
import { list } from '../../db/schema'
import { logger } from '../../logger'
import type { List, ListPlace, ListUser, ListWithSpreadOwner } from './types'
import { getListById } from './list-queries.service'

/**
 * Format a list with places to match the List interface
 */
export function formatList(
  listData: ListWithSpreadOwner,
  places: ListPlace[],
  isOwn: boolean,
  hasAccess?: boolean,
  collaborators?: ListUser[]
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
    users: collaborators,
    createdAt: listData.createdAt,
    updatedAt: listData.updatedAt,
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
