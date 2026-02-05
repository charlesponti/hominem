import type { TagOutput } from '@hominem/db/types/tags';

import { db } from '@hominem/db';
import { eventsTags } from '@hominem/db/schema/calendar';
import { tags } from '@hominem/db/schema/tags';
import { and, asc, eq, inArray } from '@hominem/db';
import { randomUUID } from 'node:crypto';

export interface TagInput {
  name: string;
  color?: string;
  description?: string;
}

export async function getTagsForEvent(
  eventId: string,
): Promise<Array<{ id: string; name: string; color: string | null; description: string | null }>> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(eventsTags)
    .innerJoin(tags, eq(eventsTags.tagId, tags.id))
    .where(eq(eventsTags.eventId, eventId));
}

export async function getTagsForEvents(
  eventIds: string[],
): Promise<
  Map<string, Array<{ id: string; name: string; color: string | null; description: string | null }>>
> {
  if (eventIds.length === 0) {
    return new Map();
  }

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
    .where(inArray(eventsTags.eventId, eventIds));

  const map = new Map<
    string,
    Array<{
      id: string;
      name: string;
      color: string | null;
      description: string | null;
    }>
  >();
  for (const row of rows) {
    if (!row.eventId) {
      continue;
    }
    if (!map.has(row.eventId)) {
      map.set(row.eventId, []);
    }
    map.get(row.eventId)!.push({
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
    });
  }
  return map;
}

export async function addTagsToEvent(eventId: string, tagIds: string[]) {
  if (tagIds.length === 0) {
    return [];
  }

  const relationships = tagIds.map((tagId) => ({
    eventId,
    tagId,
  }));

  return db.insert(eventsTags).values(relationships).returning();
}

export async function removeTagsFromEvent(eventId: string, tagIds?: string[]) {
  if (tagIds && tagIds.length > 0) {
    return db
      .delete(eventsTags)
      .where(and(eq(eventsTags.eventId, eventId), inArray(eventsTags.tagId, tagIds)));
  }

  return db.delete(eventsTags).where(eq(eventsTags.eventId, eventId));
}

export async function syncTagsForEvent(eventId: string, tagIds: string[]) {
  await removeTagsFromEvent(eventId);

  if (tagIds.length > 0) {
    return addTagsToEvent(eventId, tagIds);
  }

  return [];
}

export async function getTags(): Promise<TagOutput[]> {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getTagById(id: string): Promise<TagOutput | null> {
  const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

  return result[0] ?? null;
}

export async function getTagByName(name: string): Promise<TagOutput | null> {
  const result = await db.select().from(tags).where(eq(tags.name, name)).limit(1);

  return result[0] ?? null;
}

export async function createTag(tag: TagInput): Promise<TagOutput> {
  const { randomUUID } = await import('node:crypto');
  const result = await db
    .insert(tags)
    .values({
      id: randomUUID(),
      name: tag.name,
      color: tag.color || null,
      description: tag.description || null,
    })
    .returning();

  if (!result[0]) {
    throw new Error('Failed to create tag');
  }

  return result[0];
}

export async function updateTag(id: string, tag: TagInput): Promise<TagOutput | null> {
  const updateData: Record<string, unknown> = {};

  if (tag.name !== undefined) {
    updateData.name = tag.name;
  }
  if (tag.color !== undefined) {
    updateData.color = tag.color;
  }
  if (tag.description !== undefined) {
    updateData.description = tag.description;
  }

  const result = await db.update(tags).set(updateData).where(eq(tags.id, id)).returning();

  return result[0] ?? null;
}

export async function deleteTag(id: string): Promise<boolean> {
  await db.delete(eventsTags).where(eq(eventsTags.tagId, id));

  const result = await db.delete(tags).where(eq(tags.id, id)).returning();

  return result.length > 0;
}

export async function findOrCreateTagsByNames(tagNames: string[]): Promise<TagOutput[]> {
  if (tagNames.length === 0) {
    return [];
  }

  const tagValues = tagNames.map((name) => ({
    id: randomUUID(),
    name,
    color: null,
    description: null,
    userId: null,
  }));

  await db.insert(tags).values(tagValues).onConflictDoNothing({ target: tags.name });

  // Query all tags by names to get their IDs (including the ones we just created)
  const allTags = await db.select().from(tags).where(inArray(tags.name, tagNames));

  // Create a map for O(1) lookup and maintain order
  const tagMap = new Map(allTags.map((tag) => [tag.name, tag] as const));

  return tagNames.map((name) => tagMap.get(name)!);
}
