import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'd1000000-0000-4000-8000-000000000001';

const personId = 'd1000001-0000-4000-8000-000000000001';
const placeId = 'd1000002-0000-4000-8000-000000000001';

type TestTag = { id: string; name: string };
type TestResultContent = {
  tag?: TestTag;
  tags?: TestTag[];
  count?: number;
  removed?: boolean;
};

function resultContent(res: McpToolResult): TestResultContent {
  return res.structuredContent as TestResultContent;
}

beforeAll(async () => {
  // Cascades to every app.* row owned by this test user, so each run starts from a
  // clean slate regardless of what a previous run left behind.
  await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4)`,
    [userId, 'Test User', `${userId}@test.hominem.dev`, true],
  );

  await db
    .insertInto('app.people')
    .values([{ id: personId, ownerUserid: userId, displayName: 'Tag Target Person' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.places')
    .values([{ id: placeId, ownerUserid: userId, name: 'Tag Target Place' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
});

describe('tag_entity / untag_entity / entity_tags', () => {
  it('creates a new tag and assigns it to a person', async () => {
    await import('./tags');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'tag_entity', {
      entityType: 'people',
      entityId: personId,
      tagName: 'Close Friend',
    });
    const data = resultContent(result);

    expect(data.tag?.name).toBe('Close Friend');

    const listed = await callTool(userId, 'entity_tags', {
      entityType: 'people',
      entityId: personId,
    });
    expect(resultContent(listed).tags).toEqual([{ id: data.tag?.id, name: 'Close Friend' }]);
  });

  it('reuses an existing tag by name case-insensitively instead of creating a duplicate', async () => {
    const { callTool } = await import('../tools');

    const first = await callTool(userId, 'tag_entity', {
      entityType: 'places',
      entityId: placeId,
      tagName: 'favorite',
    });
    const second = await callTool(userId, 'tag_entity', {
      entityType: 'people',
      entityId: personId,
      tagName: 'FAVORITE',
    });

    expect(resultContent(second).tag?.id).toBe(resultContent(first).tag?.id);
  });

  it('is idempotent — tagging the same entity with the same tag twice does not duplicate', async () => {
    const { callTool } = await import('../tools');

    await callTool(userId, 'tag_entity', {
      entityType: 'places',
      entityId: placeId,
      tagName: 'Repeat Tag',
    });
    await callTool(userId, 'tag_entity', {
      entityType: 'places',
      entityId: placeId,
      tagName: 'Repeat Tag',
    });

    const listed = await callTool(userId, 'entity_tags', {
      entityType: 'places',
      entityId: placeId,
    });
    const matches = resultContent(listed).tags?.filter((t) => t.name === 'Repeat Tag');
    expect(matches).toHaveLength(1);
  });

  it('returns an empty list for an entity with no tags', async () => {
    const { callTool } = await import('../tools');

    const untaggedPersonId = 'd1000001-0000-4000-8000-000000000002';
    await db
      .insertInto('app.people')
      .values([{ id: untaggedPersonId, ownerUserid: userId, displayName: 'Untagged Person' }])
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    const result = await callTool(userId, 'entity_tags', {
      entityType: 'people',
      entityId: untaggedPersonId,
    });

    expect(resultContent(result)).toEqual({ tags: [], count: 0 });
  });

  it('removes a tag assignment and reports removed: true', async () => {
    const { callTool } = await import('../tools');

    const tagged = await callTool(userId, 'tag_entity', {
      entityType: 'people',
      entityId: personId,
      tagName: 'Removable',
    });
    const tagId = resultContent(tagged).tag?.id as string;

    const removed = await callTool(userId, 'untag_entity', {
      entityType: 'people',
      entityId: personId,
      tagId,
    });
    expect(resultContent(removed)).toEqual({ removed: true });

    const listed = await callTool(userId, 'entity_tags', {
      entityType: 'people',
      entityId: personId,
    });
    expect(resultContent(listed).tags?.some((t) => t.id === tagId)).toBe(false);
  });

  it('reports removed: false when there was nothing to remove', async () => {
    const { callTool } = await import('../tools');

    const tagged = await callTool(userId, 'tag_entity', {
      entityType: 'people',
      entityId: personId,
      tagName: 'Untouched',
    });
    const tagId = resultContent(tagged).tag?.id as string;

    const result = await callTool(userId, 'untag_entity', {
      entityType: 'places', // wrong entity type — this tag was assigned to a person
      entityId: placeId,
      tagId,
    });
    expect(resultContent(result)).toEqual({ removed: false });
  });
});
