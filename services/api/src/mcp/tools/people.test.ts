import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'b1000000-0000-4000-8000-000000000001';

const adaId = 'b1000001-0000-4000-8000-000000000001';
const graceId = 'b1000001-0000-4000-8000-000000000002';
const orgId = 'b1000003-0000-4000-8000-000000000001';
const tagId = 'b1000004-0000-4000-8000-000000000001';
const calendarId = 'b1000008-0000-4000-8000-000000000001';
const eventId = 'b1000009-0000-4000-8000-000000000001';
const tripId = 'b1000010-0000-4000-8000-000000000001';

type TestPerson = Record<string, unknown>;
type TestResultContent = {
  people?: TestPerson[];
  count?: number;
  person?: TestPerson | null;
  calendarEvents?: Array<Record<string, unknown>>;
  trips?: Array<Record<string, unknown>>;
  relations?: Array<Record<string, unknown>>;
  socialContacts?: Array<Record<string, unknown>>;
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

  await db
    .insertInto('app.personRelationships')
    .values([
      {
        id: 'b1000007-0000-4000-8000-000000000002',
        ownerUserid: userId,
        fromPersonId: adaId,
        toPersonId: graceId,
        relationshipType: 'sister',
        startedAt: '2015-01-01',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.calendars')
    .values([{ id: calendarId, ownerUserid: userId, name: 'Work' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.calendarEvents')
    .values([
      {
        id: eventId,
        ownerUserid: userId,
        calendarId,
        title: 'Analytical Engine Demo',
        startsAt: '2026-07-10T09:00:00.000Z',
        status: 'confirmed',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.calendarEventAttendees')
    .values([
      {
        id: 'b1000008-0000-4000-8000-000000000001',
        eventId,
        personId: adaId,
        role: 'organizer',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.travelTrips')
    .values([
      {
        id: tripId,
        ownerUserid: userId,
        name: 'Denver',
        city: 'Denver',
        country: 'USA',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
      },
    ])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.travelTripAttendees')
    .values([
      {
        id: 'b1000011-0000-4000-8000-000000000001',
        tripId,
        personId: adaId,
        role: 'attendee',
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

describe('person_timeline', () => {
  it('returns the person summary with calendar events, trips, and relations', async () => {
    await import('./people');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'person_timeline', { personId: adaId });
    const data = resultContent(result);

    expect(data.person).toMatchObject({ displayName: 'Ada Lovelace', personType: 'friend' });
    expect(data.calendarEvents).toEqual([
      {
        id: eventId,
        title: 'Analytical Engine Demo',
        startsAt: '2026-07-10 09:00:00+00',
        role: 'organizer',
      },
    ]);
    expect(data.trips).toEqual([
      {
        id: tripId,
        city: 'Denver',
        state: null,
        country: 'USA',
        startDate: '2026-08-01',
        endDate: '2026-08-05',
        role: 'attendee',
      },
    ]);
    expect(data.relations).toEqual([
      {
        relatedPersonId: graceId,
        relatedDisplayName: 'Grace Hopper',
        relation: 'sister',
        startedAt: '2015-01-01 00:00:00+00',
        endedAt: null,
      },
    ]);
    expect(data.socialContacts).toEqual([]);
  });

  it('returns an empty timeline for a person not owned by the caller', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'person_timeline', {
      personId: '99999999-9999-4999-8999-999999999999',
    });
    const data = resultContent(result);

    expect(data.person).toBeNull();
    expect(data.calendarEvents).toEqual([]);
    expect(data.trips).toEqual([]);
    expect(data.relations).toEqual([]);
    expect(data.socialContacts).toEqual([]);
  });
});
