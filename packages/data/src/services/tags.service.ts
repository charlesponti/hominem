import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { eventsTags, tags } from '../db/schema'

export interface TagInput {
  name: string
  color?: string
  description?: string
}

export async function getTagsForLifeEvent(eventId: string) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(eventsTags)
    .innerJoin(tags, eq(eventsTags.tagId, tags.id))
    .where(eq(eventsTags.eventId, eventId))
}

export async function getTagsForLifeEvents(eventIds: string[]) {
  if (eventIds.length === 0) return new Map()

  const rows = await db
    .select({
      eventId: eventsTags.eventId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(eventsTags)
    .innerJoin(tags, eq(eventsTags.tagId, tags.id))
    .where(inArray(eventsTags.eventId, eventIds))

  const map = new Map<
    string,
    Array<{ id: string; name: string; color: string | null; description: string | null }>
  >()
  for (const row of rows) {
    if (!map.has(row.eventId)) {
      map.set(row.eventId, [])
    }
    map.get(row.eventId)!.push({
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
    })
  }
  return map
}

export async function addTagsToLifeEvent(eventId: string, tagIds: string[]) {
  if (tagIds.length === 0) return []

  const relationships = tagIds.map((tagId) => ({
    eventId,
    tagId,
  }))

  return db.insert(eventsTags).values(relationships).returning()
}

export async function removeTagsFromLifeEvent(eventId: string, tagIds?: string[]) {
  if (tagIds && tagIds.length > 0) {
    return db
      .delete(eventsTags)
      .where(and(eq(eventsTags.eventId, eventId), inArray(eventsTags.tagId, tagIds)))
  }

  return db.delete(eventsTags).where(eq(eventsTags.eventId, eventId))
}

export async function syncTagsForLifeEvent(eventId: string, tagIds: string[]) {
  await removeTagsFromLifeEvent(eventId)

  if (tagIds.length > 0) {
    return addTagsToLifeEvent(eventId, tagIds)
  }

  return []
}

export async function getTags() {
  return db.select().from(tags).orderBy(asc(tags.name))
}

export async function getTagById(id: string) {
  const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function getTagByName(name: string) {
  const result = await db.select().from(tags).where(eq(tags.name, name)).limit(1)

  return result.length > 0 ? result[0] : null
}

export async function createTag(tag: TagInput) {
  const result = await db
    .insert(tags)
    .values({
      name: tag.name,
      color: tag.color || null,
      description: tag.description || null,
    })
    .returning()

  return result[0]
}

export async function updateTag(id: string, tag: TagInput) {
  const updateData: Record<string, unknown> = {}

  if (tag.name !== undefined) updateData.name = tag.name
  if (tag.color !== undefined) updateData.color = tag.color
  if (tag.description !== undefined) updateData.description = tag.description

  const result = await db.update(tags).set(updateData).where(eq(tags.id, id)).returning()

  return result.length > 0 ? result[0] : null
}

export async function deleteTag(id: string) {
  await db.delete(eventsTags).where(eq(eventsTags.tagId, id))

  const result = await db.delete(tags).where(eq(tags.id, id)).returning()

  return result.length > 0
}

export async function findOrCreateTagsByNames(tagNames: string[]) {
  const tagList = []

  for (const name of tagNames) {
    let tag = await getTagByName(name)
    if (!tag) {
      tag = await createTag({ name })
    }
    tagList.push(tag)
  }

  return tagList
}
