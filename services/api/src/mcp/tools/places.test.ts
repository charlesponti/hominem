import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'a1000000-0000-4000-8000-000000000001';

const cafeId = 'a1000001-0000-4000-8000-000000000001';
const parkId = 'a1000001-0000-4000-8000-000000000002';

type TestVisit = Record<string, unknown>;
type TestResultContent = {
  visits?: TestVisit[];
  count?: number;
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
    .insertInto('app.places')
    .values([
      {
        id: cafeId,
        ownerUserid: userId,
        name: 'Blue Bottle Coffee',
        formattedAddress: '300 Webster St, Oakland, CA',
      },
      {
        id: parkId,
        ownerUserid: userId,
        name: 'Lake Merritt',
        formattedAddress: '1 Lakeside Dr, Oakland, CA',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.placeVisits')
    .values([
      {
        id: 'a1000002-0000-4000-8000-000000000001',
        ownerUserid: userId,
        placeId: cafeId,
        visitedAt: '2026-07-01T09:00:00.000Z',
        purpose: 'coffee',
        notes: 'worked on the migration doc',
      },
      {
        id: 'a1000002-0000-4000-8000-000000000002',
        ownerUserid: userId,
        placeId: parkId,
        visitedAt: '2026-07-10T17:00:00.000Z',
        purpose: 'walk',
        notes: null,
      },
      {
        id: 'a1000002-0000-4000-8000-000000000003',
        ownerUserid: userId,
        placeId: null,
        visitedAt: '2026-07-15T12:00:00.000Z',
        purpose: 'lunch',
        notes: 'place link never resolved',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
});

describe('place_visit_history', () => {
  it('returns visits newest first, joined against the place name and address', async () => {
    await import('./places');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'place_visit_history', { limit: 20 });
    const data = resultContent(result);

    expect(data.count).toBe(3);
    expect(data.visits?.map((v) => v.purpose)).toEqual(['lunch', 'walk', 'coffee']);

    const coffeeVisit = data.visits?.find((v) => v.purpose === 'coffee');
    expect(coffeeVisit).toMatchObject({
      placeName: 'Blue Bottle Coffee',
      address: '300 Webster St, Oakland, CA',
      notes: 'worked on the migration doc',
    });

    const unresolvedVisit = data.visits?.find((v) => v.purpose === 'lunch');
    expect(unresolvedVisit).toMatchObject({ placeName: null, address: null });
  });

  it('filters by from/to date range', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'place_visit_history', {
      from: '2026-07-05',
      to: '2026-07-12',
      limit: 20,
    });
    const data = resultContent(result);

    expect(data.visits?.map((v) => v.purpose)).toEqual(['walk']);
  });

  it('rejects a from date after the to date', async () => {
    const { callTool } = await import('../tools');

    await expect(
      callTool(userId, 'place_visit_history', {
        from: '2026-07-12',
        to: '2026-07-05',
      }),
    ).rejects.toThrow();
  });

  it('respects the limit', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'place_visit_history', { limit: 1 });
    expect(resultContent(result).visits).toHaveLength(1);
  });
});
