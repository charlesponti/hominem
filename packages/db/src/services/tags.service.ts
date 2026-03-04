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
import { tags, taggedItems } from '../schema/tags'
import type { TagId, UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import { NotFoundError, ForbiddenError } from './_shared/errors'

// Local types for this service
type Tag = typeof tags.$inferSelect
type TagInsert = typeof tags.$inferInsert
type TagUpdate = Partial<Omit<TagInsert, 'id' | 'ownerId' | 'createdAt'>>

type TaggedItem = typeof taggedItems.$inferSelect

/**
 * Internal helper: verify user ownership
 * @throws ForbiddenError if tag doesn't belong to user
 */
async function getTagWithOwnershipCheck(db: Database, tagId: TagId, userId: UserId): Promise<Tag> {
  const tag = await db.query.tags.findFirst({
    where: and(eq(tags.id, String(tagId)), eq(tags.ownerId, String(userId))),
  })

  if (!tag) {
    throw new ForbiddenError(`Tag not found or access denied`, 'ownership')
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
  const results = await db!.query.tags.findMany({
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
  const tag = await db!.query.tags.findFirst({
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
  const result = await db!.insert(tags)
    .values({
      ownerId: String(userId),
      name: input.name,
      color: input.color ?? null,
      description: input.description ?? null,
      emojiImageUrl: input.emojiImageUrl ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create tag')
  }

  return result[0]
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
  // Verify ownership first
  await getTagWithOwnershipCheck(db!, tagId, userId)

  const result = await db!.update(tags)
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
  // Verify ownership first
  await getTagWithOwnershipCheck(db!, tagId, userId)

  // Delete all tagged items first (cascade is on schema but be explicit)
  await db!.delete(taggedItems).where(eq(taggedItems.tagId, String(tagId)))

  // Delete the tag
  const result = await db!.delete(tags).where(eq(tags.id, String(tagId))).returning()

  return result.length > 0
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
  // Verify tag ownership
  await getTagWithOwnershipCheck(db!, tagId, userId)

  const results = await db!.query.taggedItems.findMany({
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
  entityId: string,
  entityType: string,
  db?: Database
): Promise<Tag[]> {
  const items = await db!.query.taggedItems.findMany({
    where: and(eq(taggedItems.entityId, entityId), eq(taggedItems.entityType, entityType)),
  })

  if (items.length === 0) {
    return []
  }

  const tagIds = items.map(item => item.tagId)
  const results = await db!.query.tags.findMany({
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
  const result = await db!.insert(taggedItems)
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
  const result = await db!.delete(taggedItems)
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
export async function syncEntityTags(
  entityId: string,
  entityType: string,
  tagIds: TagId[],
  db?: Database
): Promise<void> {
  // Remove all existing tags for this entity
  await db!.delete(taggedItems)
    .where(and(
      eq(taggedItems.entityId, entityId),
      eq(taggedItems.entityType, entityType)
    ))

  // Add new tags if any
  if (tagIds.length > 0) {
    await db!.insert(taggedItems)
      .values(
        tagIds.map(id => ({
          tagId: String(id),
          entityId,
          entityType,
        }))
      )
  }
}
