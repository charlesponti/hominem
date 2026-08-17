import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'e1000000-0000-4000-8000-000000000001';

const personId = 'e1000001-0000-4000-8000-000000000001';
const placeId = 'e1000002-0000-4000-8000-000000000001';
const calendarId = 'e1000003-0000-4000-8000-000000000001';
const tripId = 'e1000004-0000-4000-8000-000000000001';

type TestEvent = Record<string, unknown>;
type TestTrip = Record<string, unknown>;
type TestResultContent = {
  events?: TestEvent[];
  trips?: TestTrip[];
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
    .values([{ id: personId, ownerUserid: userId, displayName: 'Trip Buddy' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.places')
    .values([{ id: placeId, ownerUserid: userId, name: 'Conference Center' }])
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
        id: 'e1000005-0000-4000-8000-000000000001',
        ownerUserid: userId,
        calendarId,
        placeId,
        title: 'Quarterly Planning Offsite',
        startsAt: '2026-07-10T09:00:00.000Z',
        endsAt: '2026-07-10T17:00:00.000Z',
        status: 'confirmed',
      },
      {
        id: 'e1000005-0000-4000-8000-000000000002',
        ownerUserid: userId,
        calendarId,
        title: 'Dentist appointment',
        startsAt: '2026-07-20T14:00:00.000Z',
        status: 'confirmed',
      },
      {
        id: 'e1000005-0000-4000-8000-000000000003',
        ownerUserid: userId,
        title: 'Cancelled sync',
        startsAt: '2026-07-11T10:00:00.000Z',
        status: 'CANCELLED',
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
    .values([{ id: 'e1000006-0000-4000-8000-000000000001', tripId, personId, role: 'attendee' }])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();
});

describe('calendar_search', () => {
  it('matches events by title text and joins calendar/place names', async () => {
    await import('./calendar');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'calendar_search', { query: 'planning' });
    const data = resultContent(result);

    expect(data.count).toBe(1);
    expect(data.events?.[0]).toMatchObject({
      title: 'Quarterly Planning Offsite',
      calendarName: 'Work',
      placeName: 'Conference Center',
    });
  });

  it('excludes cancelled events unless requested', async () => {
    const { callTool } = await import('../tools');

    const withoutCancelled = await callTool(userId, 'calendar_search', { query: 'sync' });
    expect(resultContent(withoutCancelled).count).toBe(0);

    const withCancelled = await callTool(userId, 'calendar_search', {
      query: 'sync',
      includeCancelled: true,
    });
    expect(resultContent(withCancelled).count).toBe(1);
  });

  it('rejects a from date after the to date', async () => {
    const { callTool } = await import('../tools');

    await expect(
      callTool(userId, 'calendar_search', { query: 'x', from: '2026-07-20', to: '2026-07-10' }),
    ).rejects.toThrow();
  });
});

describe('calendar_upcoming', () => {
  it('lists non-cancelled events within the window, ordered by start time', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'calendar_upcoming', {
      from: '2026-07-09',
      days: 5,
    });
    const data = resultContent(result);

    expect(data.events?.map((e) => e.title)).toEqual(['Quarterly Planning Offsite']);
  });
});

describe('trip_history', () => {
  it('returns trips with resolved attendee names', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'trip_history', { limit: 20 });
    const data = resultContent(result);

    expect(data.count).toBe(1);
    expect(data.trips?.[0]).toMatchObject({
      city: 'Denver',
      country: 'USA',
      attendeeNames: ['Trip Buddy'],
    });
  });
});
