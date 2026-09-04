import { db, pool } from '@hominem/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import './collections';
import { callTool, type McpToolResult } from '../tool-registry';

const userId = 'd2000000-0000-4000-8000-000000000001';
const placeId = 'd2000002-0000-4000-8000-000000000001';

const collectionDetailResultSchema = z.object({
  items: z
    .array(
      z.object({ entityType: z.string(), entityId: z.string(), entityName: z.string().nullable() }),
    )
    .optional(),
});
const createdCollectionResultSchema = z.object({ collection: z.object({ id: z.string() }) });

const resultContent = (result: McpToolResult) =>
  collectionDetailResultSchema.parse(result.structuredContent);

beforeAll(async () => {
  await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4)`,
    [userId, 'Collection Test User', `${userId}@test.hominem.dev`, true],
  );
  await db
    .insertInto('app.places')
    .values({ id: placeId, ownerUserid: userId, name: 'Collection Test Place' })
    .execute();
});

afterAll(async () => {
  await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
});

describe('collection_detail', () => {
  it('returns entity names alongside collection item ids', async () => {
    const created = await callTool(userId, 'create_collection', { name: 'Named Places' });
    const collectionId = createdCollectionResultSchema.parse(created.structuredContent).collection
      .id;

    await callTool(userId, 'add_collection_item', {
      collectionId,
      entityType: 'places',
      entityId: placeId,
    });

    const detail = resultContent(await callTool(userId, 'collection_detail', { collectionId }));
    expect(detail.items).toContainEqual(
      expect.objectContaining({
        entityType: 'places',
        entityId: placeId,
        entityName: 'Collection Test Place',
      }),
    );
  });
});
