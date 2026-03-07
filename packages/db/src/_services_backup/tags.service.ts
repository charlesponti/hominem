/**
 * Tags service - manages tags and tagging
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, asc, inArray } from 'drizzle-orm'
import type { Database } from './client'
import { db as defaultDb } from '../index'
import { tags, taggedItems } from '../schema/tags'
import type { TagId, UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import { ConflictError, InternalError, NotFoundError, ValidationError, ForbiddenError } from './_shared/errors'

export type { TagId }

// Local types for this service
type Tag = typeof tags.$inferSelect
type TagInsert = typeof tags.$inferInsert
type TagUpdate = Partial<Omit<TagInsert, 'id' | 'ownerId' | 'createdAt'>>

type TaggedItem = typeof taggedItems.$inferSelect

function extractDbErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }
  if ('code' in error && typeof error.code === 'string') {
    return error.code
  }
  if ('cause' in error && error.cause && typeof error.cause === 'object' && 'code' in error.cause && typeof error.cause.code === 'string') {
    return error.cause.code
  }
  return null
}

/**
 * Internal helper: verify user ownership
 * @throws ForbiddenError if tag doesn't belong to user
 */
async function getTagWithOwnershipCheck(db: Database | undefined, tagId: TagId, userId: UserId): Promise<Tag> {
  const database = db || (defaultDb as any as Database)
  const tag = await database.query.tags.findFirst({
    where: eq(tags.id, String(tagId)),
  })

  if (!tag) {
    throw new NotFoundError('Tag not found', 'tag', tagId)
  }
  if (tag.ownerId !== String(userId)) {
    throw new ForbiddenError('Tag not found or access denied', 'ownership')
  }

  return tag
}

/**
 * List user's tags with optional filtering
 *
 * @param userId - User ID (enforced in all queries)
 * @param db - Database context
 * @returns Array of tags (empty if none)
 */
export async function listTags(
  userId: UserId,
  db?: Database
): Promise<Tag[]> {
  const database = db || (defaultDb as any as Database)
  const results = await database.query.tags.findMany({
    where: eq(tags.ownerId, String(userId)),
    orderBy: asc(tags.name),
  })

  return results
}

/**
 * Get a single tag by ID
 *
 * @param tagId - Tag ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Tag or null if not found
 */
export async function getTag(
  tagId: TagId,
  userId: UserId,
  db?: Database
): Promise<Tag | null> {
  const database = db || (defaultDb as any as Database)
  const tag = await database.query.tags.findFirst({
    where: and(eq(tags.id, String(tagId)), eq(tags.ownerId, String(userId))),
  })

  return tag ?? null
}

/**
 * Create a new tag
 *
 * @param userId - User ID
 * @param input - Tag data (name, color, description)
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created tag
 */
export async function createTag(
  userId: UserId,
  input: { name: string; color?: string | null; description?: string | null; emojiImageUrl?: string | null },
  db?: Database
): Promise<Tag> {
  if (!input.name.trim()) {
    throw new ValidationError('Tag name is required')
  }

  const database = db || (defaultDb as any as Database)
  try {
    const result = await database.insert(tags)
      .values({
        ownerId: String(userId),
        name: input.name,
        color: input.color ?? null,
        description: input.description ?? null,
        emojiImageUrl: input.emojiImageUrl ?? null,
      })
      .returning()

    if (!result[0]) {
      throw new InternalError('Failed to create tag')
    }

    return result[0]
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ConflictError || error instanceof InternalError) {
      throw error
    }
    const code = extractDbErrorCode(error)
    if (code === '23505') {
      throw new ConflictError('Tag name already exists', 'tags_owner_name_idx')
    }
    throw new InternalError('Failed to create tag', error)
  }
}

/**
 * Update an existing tag
 *
 * @param tagId - Tag ID
 * @param userId - User ID (enforces ownership)
 * @param input - Partial tag data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the tag
 * @returns Updated tag or null if already deleted
 */
export async function updateTag(
  tagId: TagId,
  userId: UserId,
  input: TagUpdate,
  db?: Database
): Promise<Tag | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getTagWithOwnershipCheck(database, tagId, userId)

  const result = await database.update(tags)
    .set(input)
    .where(eq(tags.id, String(tagId)))
    .returning()

  return result[0] ?? null
}

/**
 * Delete a tag
 *
 * @param tagId - Tag ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the tag
 * @returns True if deleted, false if already deleted
 */
export async function deleteTag(
  tagId: TagId,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  return database.transaction(async (tx) => {
    await getTagWithOwnershipCheck(tx as Database, tagId, userId)
    await tx.delete(taggedItems).where(eq(taggedItems.tagId, String(tagId)))
    const result = await tx.delete(tags).where(eq(tags.id, String(tagId))).returning()
    return result.length > 0
  })
}

/**
 * Get all items tagged with a specific tag
 *
 * @param tagId - Tag ID
 * @param userId - User ID (enforces ownership of tag)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the tag
 * @returns Array of tagged items
 */
export async function listTaggedItems(
  tagId: TagId,
  userId: UserId,
  db?: Database
): Promise<TaggedItem[]> {
  const database = db || (defaultDb as any as Database)
  // Verify tag ownership
  await getTagWithOwnershipCheck(database, tagId, userId)

  const results = await database.query.taggedItems.findMany({
    where: eq(taggedItems.tagId, String(tagId)),
  })

  return results
}

/**
 * Get tags for a specific entity
 *
 * @param entityId - Entity ID (e.g., event, task)
 * @param entityType - Entity type (e.g., 'calendar_event', 'task')
 * @param db - Database context
 * @returns Array of tags (empty if none)
 */
export async function listTagsForEntity(
  ownerId: UserId,
  entityId: string,
  entityType: string,
  db?: Database
): Promise<Tag[]> {
  const database = db || (defaultDb as any as Database)
  const items = await database
    .select({ tagId: taggedItems.tagId })
    .from(taggedItems)
    .innerJoin(tags, eq(taggedItems.tagId, tags.id))
    .where(
      and(
        eq(taggedItems.entityId, entityId),
        eq(taggedItems.entityType, entityType),
        eq(tags.ownerId, String(ownerId))
      )
    )

  if (items.length === 0) {
    return []
  }

  const tagIds = items.map(item => item.tagId)
  const results = await database.query.tags.findMany({
    where: inArray(tags.id, tagIds),
  })

  return results
}

/**
 * Tag an entity
 *
 * @param tagId - Tag ID
 * @param entityId - Entity ID
 * @param entityType - Entity type
 * @param db - Database context
 * @throws Error if tag doesn't exist
 * @returns Tagged item
 */
export async function tagEntity(
  tagId: TagId,
  entityId: string,
  entityType: string,
  db?: Database
): Promise<TaggedItem> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(taggedItems)
    .values({
      tagId: String(tagId),
      entityId,
      entityType,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to tag entity')
  }

  return result[0]
}

/**
 * Untag an entity
 *
 * @param tagId - Tag ID
 * @param entityId - Entity ID
 * @param entityType - Entity type
 * @param db - Database context
 * @returns True if untagged, false if no tag existed
 */
export async function untagEntity(
  tagId: TagId,
  entityId: string,
  entityType: string,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  const result = await database.delete(taggedItems)
    .where(and(
      eq(taggedItems.tagId, String(tagId)),
      eq(taggedItems.entityId, entityId),
      eq(taggedItems.entityType, entityType)
    ))
    .returning()

  return result.length > 0
}

/**
 * Sync tags for an entity (replace all tags)
 *
 * @param entityId - Entity ID
 * @param entityType - Entity type
 * @param tagIds - List of tag IDs to apply
 * @param db - Database context
 */
export async function replaceEntityTags(
  ownerId: UserId,
  entityId: string,
  entityType: string,
  tagIds: TagId[],
  db?: Database
): Promise<void> {
  const database = db || (defaultDb as any as Database)
  const dedupedTagIds = [...new Set(tagIds.map(id => String(id)))]

  await database.transaction(async (tx) => {
    if (dedupedTagIds.length > 0) {
      const ownedTags = await tx.query.tags.findMany({
        columns: { id: true },
        where: and(eq(tags.ownerId, String(ownerId)), inArray(tags.id, dedupedTagIds)),
      })
      if (ownedTags.length !== dedupedTagIds.length) {
        throw new ForbiddenError('Tag not found or access denied', 'ownership')
      }
    }

    const existingOwnedTagRows = await tx
      .select({ tagId: taggedItems.tagId })
      .from(taggedItems)
      .innerJoin(tags, eq(taggedItems.tagId, tags.id))
      .where(
        and(
          eq(taggedItems.entityId, entityId),
          eq(taggedItems.entityType, entityType),
          eq(tags.ownerId, String(ownerId))
        )
      )

    const existingOwnedTagIds = existingOwnedTagRows.map(row => row.tagId)

    if (existingOwnedTagIds.length > 0) {
      await tx
        .delete(taggedItems)
        .where(
          and(
            eq(taggedItems.entityId, entityId),
            eq(taggedItems.entityType, entityType),
            inArray(taggedItems.tagId, existingOwnedTagIds)
          )
        )
    }

    if (dedupedTagIds.length > 0) {
      await tx
        .insert(taggedItems)
        .values(
          dedupedTagIds.map(tagId => ({
            tagId,
            entityId,
            entityType,
          }))
        )
        .onConflictDoNothing()
    }
  })
}
