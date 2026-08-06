import { db, sql } from '@hominem/db';
import type * as z from 'zod';

import type { entityTypeSchema } from '../schemas/tags.schema';

export type EntityType = z.output<typeof entityTypeSchema>;

// Only entity types with a live, migrated table are listed here — this is an
// allow-list, not a passthrough, since entity_table casts straight to a
// Postgres regclass and must never be built from unvalidated input. Extend as
// later migration phases land more taggable domains.
export const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  people: 'app.people',
  places: 'app.places',
  possessions: 'app.possessions',
};

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'tag';
}

async function findTagByName(ownerUserId: string, name: string) {
  return db
    .selectFrom('app.tags')
    .select(['id', 'name'])
    .where('ownerUserid', '=', ownerUserId)
    .where(sql<boolean>`lower(name) = lower(${name})`)
    .where('archivedAt', 'is', null)
    .executeTakeFirst();
}

async function findOrCreateTag(ownerUserId: string, tagName: string) {
  const existing = await findTagByName(ownerUserId, tagName);
  if (existing) return existing;

  const slug = slugify(tagName);
  try {
    return await db
      .insertInto('app.tags')
      .values({
        ownerUserid: ownerUserId,
        name: tagName,
        slug,
        path: sql`${slug}::ltree`,
      })
      .returning(['id', 'name'])
      .executeTakeFirstOrThrow();
  } catch {
    // Lost a race against a concurrent insert of the same name — the unique
    // (owner, lower(name)) constraint means it exists now; fetch it.
    const created = await findTagByName(ownerUserId, tagName);
    if (!created) throw new Error(`Failed to find or create tag "${tagName}"`);
    return created;
  }
}

export async function tagEntity(
  ownerUserId: string,
  input: { entityType: EntityType; entityId: string; tagName: string },
) {
  const tag = await findOrCreateTag(ownerUserId, input.tagName);
  const entityTable = ENTITY_TABLE_MAP[input.entityType];

  await sql`
    INSERT INTO app.tag_assignments (tag_id, entity_table, entity_id, assignment_source)
    VALUES (${tag.id}, ${entityTable}::regclass, ${input.entityId}, 'agent')
    ON CONFLICT (tag_id, entity_table, entity_id) WHERE removed_at IS NULL
    DO NOTHING
  `.execute(db);

  return { tag };
}

export async function untagEntity(
  ownerUserId: string,
  input: { entityType: EntityType; entityId: string; tagId: string },
) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType];

  const result = await sql<{ id: string }>`
    UPDATE app.tag_assignments
    SET removed_at = now()
    WHERE tag_id = ${input.tagId}
      AND entity_table = ${entityTable}::regclass
      AND entity_id = ${input.entityId}
      AND removed_at IS NULL
      AND tag_id IN (SELECT id FROM app.tags WHERE owner_userid = ${ownerUserId})
    RETURNING id
  `.execute(db);

  return { removed: result.rows.length > 0 };
}

export async function listEntityTags(
  ownerUserId: string,
  input: { entityType: EntityType; entityId: string },
) {
  const entityTable = ENTITY_TABLE_MAP[input.entityType];

  const rows = await sql<{ id: string; name: string }>`
    SELECT t.id, t.name
    FROM app.tag_assignments ta
    JOIN app.tags t ON t.id = ta.tag_id
    WHERE ta.entity_table = ${entityTable}::regclass
      AND ta.entity_id = ${input.entityId}
      AND ta.removed_at IS NULL
      AND t.owner_userid = ${ownerUserId}
    ORDER BY t.name
  `.execute(db);

  return { tags: rows.rows, count: rows.rows.length };
}
