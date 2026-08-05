import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'b1000000-0000-4000-8000-000000000001';

const adaId = 'b1000001-0000-4000-8000-000000000001';
const graceId = 'b1000001-0000-4000-8000-000000000002';
const orgId = 'b1000003-0000-4000-8000-000000000001';
const tagId = 'b1000004-0000-4000-8000-000000000001';

type TestPerson = Record<string, unknown>;
type TestResultContent = {
  people?: TestPerson[];
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
    .insertInto('app.people')
    .values([
      {
        id: adaId,
        ownerUserid: userId,
        firstName: 'Ada',
        lastName: 'Lovelace',
        displayName: 'Ada Lovelace',
        personType: 'friend',
        notes: 'mathematician',
      },
      {
        id: graceId,
        ownerUserid: userId,
        firstName: 'Grace',
        lastName: 'Hopper',
        displayName: 'Grace Hopper',
        personType: 'colleague',
        notes: null,
        aliases: JSON.stringify(['Amazing Grace']),
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.personContactMethods')
    .values([
      {
        id: 'b1000005-0000-4000-8000-000000000001',
        ownerUserid: userId,
        personId: adaId,
        kind: 'email',
        value: 'ada@example.com',
        isPrimary: true,
        source: 'manual',
      },
      {
        id: 'b1000005-0000-4000-8000-000000000002',
        ownerUserid: userId,
        personId: adaId,
        kind: 'phone',
        value: '555-0100',
        isPrimary: true,
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.organizations')
    .values([{ id: orgId, ownerUserid: userId, name: 'Analytical Engines Inc' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.organizationMemberships')
    .values([
      {
        id: 'b1000006-0000-4000-8000-000000000001',
        ownerUserid: userId,
        organizationId: orgId,
        personId: adaId,
        isPrimary: true,
        source: 'manual',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.tags')
    .values([
      { id: tagId, ownerUserid: userId, name: 'colleague', path: 'colleague', slug: 'colleague' },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.tagAssignments')
    .values([
      {
        id: 'b1000007-0000-4000-8000-000000000001',
        tagId,
        entityTable: 'app.people',
        entityId: graceId,
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
});

describe('people_lookup', () => {
  it('matches on display name and returns contact/organization details', async () => {
    await import('./people');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'people_lookup', { query: 'ada', limit: 10 });
    const data = resultContent(result);

    expect(data.count).toBe(1);
    expect(data.people?.[0]).toMatchObject({
      displayName: 'Ada Lovelace',
      emails: [{ email: 'ada@example.com', isPrimary: true, source: 'manual' }],
      phones: [{ phoneNumber: '555-0100', isPrimary: true }],
      organizations: [{ organization: 'Analytical Engines Inc', isPrimary: true }],
    });
  });

  it('matches on alias', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'people_lookup', { query: 'Amazing Grace', limit: 10 });
    const data = resultContent(result);

    expect(data.count).toBe(1);
    expect(data.people?.[0]?.displayName).toBe('Grace Hopper');
  });

  it('includes tag names via the generic tag-assignment join', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'people_lookup', { query: 'Grace', limit: 10 });
    const data = resultContent(result);

    expect(data.people?.[0]?.tags).toEqual(['colleague']);
  });

  it('returns no matches for an unrelated query', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'people_lookup', { query: 'nonexistent-xyz', limit: 10 });
    expect(resultContent(result).count).toBe(0);
  });
});
