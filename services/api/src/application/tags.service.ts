import { db, sql } from '@hominem/db/core';
import type * as z from 'zod';

import type { entityTypeSchema } from '../schemas/tags.schema';

export type EntityType = z.output<typeof entityTypeSchema>;

// Only entity types with a live, migrated table go here — it's an allow-list, not a
// passthrough, since entity_table casts straight to a Postgres regclass and can never
// come from unvalidated input. Add more as later migrations bring more domains in.
export const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  people: 'app.people',
  places: 'app.places',
  possessions: 'app.possessions',
  notes: 'app.notes',
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
    // lost the race to a concurrent insert of the same name — the unique (owner, lower(name))
    // constraint means it's there now, so just go fetch it
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

/** Fetches a tag's name by id, scoped to its owner — used for confirmation previews. */
export async function getTagName(ownerUserId: string, tagId: string): Promise<string | null> {
  const row = await db
    .selectFrom('app.tags')
    .select('name')
    .where('id', '=', tagId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirst();
  return row?.name ?? null;
}

/**
 * Best-effort display name for a person/place/possession, for confirmation
 * previews — not a general-purpose entity API. People use `displayName`
 * (falling back to first/last name); places and possessions use `name`.
 */
export async function getEntityDisplayName(
  ownerUserId: string,
  entityType: EntityType,
  entityId: string,
): Promise<string | null> {
  if (entityType === 'people') {
    const row = await db
      .selectFrom('app.people')
      .select(['displayName', 'firstName', 'lastName'])
      .where('id', '=', entityId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    if (!row) return null;
    if (row.displayName) return row.displayName;
    const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');
    return fullName || null;
  }

  if (entityType === 'notes') {
    const row = await db
      .selectFrom('app.notes')
      .select('title')
      .where('id', '=', entityId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return row?.title || '(untitled note)';
  }

  const table = entityType === 'places' ? 'app.places' : 'app.possessions';
  const row = await db
    .selectFrom(table)
    .select('name')
    .where('id', '=', entityId)
    .where('ownerUserid', '=', ownerUserId)
    .executeTakeFirst();
  return row?.name ?? null;
}
