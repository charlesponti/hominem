import { randomUUID } from 'node:crypto';

import { db } from '.';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { taggedItems } from '@hominem/db/schema/tags';
import { tags } from '@hominem/db/schema/tags';

export type TagSelect = typeof tags.$inferSelect;
export type TagInsert = typeof tags.$inferInsert;

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
    .from(taggedItems)
    .innerJoin(tags, eq(taggedItems.tagId, tags.id))
    .where(and(eq(taggedItems.entityId, eventId), eq(taggedItems.entityType, 'calendar_event')));
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
      entityId: taggedItems.entityId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
      description: tags.description,
    })
    .from(taggedItems)
    .innerJoin(tags, eq(taggedItems.tagId, tags.id))
    .where(and(inArray(taggedItems.entityId, eventIds), eq(taggedItems.entityType, 'calendar_event')));

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
    if (!row.entityId) {
      continue;
    }
    if (!map.has(row.entityId)) {
      map.set(row.entityId, []);
    }
    map.get(row.entityId)!.push({
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
    entityId: eventId,
    entityType: 'calendar_event',
    tagId,
  }));

  return db.insert(taggedItems).values(relationships).returning();
}

export async function removeTagsFromEvent(eventId: string, tagIds?: string[]): Promise<void> {
  const baseCondition = and(
    eq(taggedItems.entityId, eventId),
    eq(taggedItems.entityType, 'calendar_event')
  );

  if (tagIds && tagIds.length > 0) {
    await db
      .delete(taggedItems)
      .where(and(baseCondition, inArray(taggedItems.tagId, tagIds)));
    return;
  }

  await db.delete(taggedItems).where(baseCondition);
}

export async function syncTagsForEvent(eventId: string, tagIds: string[]) {
  await removeTagsFromEvent(eventId);

  if (tagIds.length > 0) {
    return addTagsToEvent(eventId, tagIds);
  }

  return [];
}

export async function getTags(): Promise<TagSelect[]> {
  return db.select().from(tags).orderBy(asc(tags.name));
}

export async function getTagById(id: string): Promise<TagSelect | null> {
  const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

  return result[0] ?? null;
}

export async function getTagByName(name: string): Promise<TagSelect | null> {
  const result = await db.select().from(tags).where(eq(tags.name, name)).limit(1);

  return result[0] ?? null;
}

export async function createTag(ownerId: string, tag: TagInput): Promise<TagSelect> {
  const result = await db
    .insert(tags)
    .values({
      id: randomUUID(),
      ownerId,
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

export async function updateTag(id: string, tag: TagInput): Promise<TagSelect | null> {
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
  await db.delete(taggedItems).where(eq(taggedItems.tagId, id));

  const result = await db.delete(tags).where(eq(tags.id, id)).returning();

  return result.length > 0;
}

export async function findOrCreateTagsByNames(ownerId: string, tagNames: string[]): Promise<TagSelect[]> {
  if (tagNames.length === 0) {
    return [];
  }

  const tagValues = tagNames.map((name) => ({
    id: randomUUID(),
    ownerId,
    name,
    color: null,
    description: null,
  }));

  await db.insert(tags).values(tagValues).onConflictDoNothing({ target: [tags.ownerId, tags.name] });

  const allTags = await db.select().from(tags).where(inArray(tags.name, tagNames));

  const tagMap = new Map(allTags.map((tag) => [tag.name, tag] as const));

  return tagNames.map((name) => tagMap.get(name)!);
}
