import crypto from 'node:crypto';

import { db } from '@hominem/db';
import { sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  updateEvent,
} from './event-core.service';
import { getVisitsByUser } from './visits.service';

const dbAvailable = await isIntegrationDatabaseAvailable();
const nextUserId = createDeterministicIdFactory('events.integration');

describe.skipIf(!dbAvailable)('events integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerContactId: string;

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    if (userIds.length === 0) {
      return;
    }
    const userIdsSql = sql.join(
      userIds.map((id) => sql`${id}`),
      sql`, `,
    );
    await db
      .execute(sql`delete from calendar_events where user_id in (${userIdsSql})`)
      .catch(() => {});
    await db.execute(sql`delete from tags where owner_id in (${userIdsSql})`).catch(() => {});
    await db
      .execute(sql`delete from persons where owner_user_id in (${userIdsSql})`)
      .catch(() => {});
    await db.execute(sql`delete from users where id in (${userIdsSql})`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();
    await cleanupForUsers([ownerId, otherUserId]);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Events Owner' },
      { id: otherUserId, name: 'Events Other User' },
    ]);

    ownerContactId = nextUserId();
    await db.execute(sql`
      insert into persons (id, owner_user_id, person_type, first_name, last_name, email)
      values (${ownerContactId}, ${ownerId}, 'contact', 'Companion', 'One', ${`${ownerContactId}@example.com`})
    `);
  });

  it('creates and fetches an event with tags and people', async () => {
    const created = await createEvent({
      title: 'Integration Event',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['family', 'weekend'],
      people: [ownerContactId],
    });

    const loaded = await getEventById(created.id);

    expect(loaded).not.toBeNull();
    expect(loaded?.tags.map((tag) => tag.name).sort()).toEqual(['family', 'weekend']);
    expect(loaded?.people.map((person) => person.id)).toEqual([ownerContactId]);
  });

  it('updates event title and synchronizes tag set', async () => {
    const created = await createEvent({
      title: 'Before Title',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['old-tag'],
    });

    const updated = await updateEvent(created.id, {
      title: 'After Title',
      tags: ['new-tag'],
    });

    expect(updated?.title).toBe('After Title');
    expect(updated?.tags.map((tag) => tag.name)).toEqual(['new-tag']);
  });

  it('deletes event and clears junction records', async () => {
    const created = await createEvent({
      title: 'Delete Me',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['cleanup'],
      people: [ownerContactId],
    });

    const deleted = await deleteEvent(created.id);

    const eventAfterDelete = await getEventById(created.id);
    const peopleAfterDelete = await db.execute(sql`
      select id from calendar_attendees where event_id = ${created.id}
    `);

    expect(deleted).toBe(true);
    expect(eventAfterDelete).toBeNull();
    const rows = Array.isArray(peopleAfterDelete)
      ? peopleAfterDelete
      : 'rows' in peopleAfterDelete
        ? peopleAfterDelete.rows
        : [];
    expect(rows).toHaveLength(0);
  });

  it('returns visits scoped to requesting user only', async () => {
    await createEvent({
      title: 'Owner Visit',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      placeId: crypto.randomUUID(),
    });

    await createEvent({
      title: 'Other Visit',
      userId: otherUserId,
      date: new Date('2026-03-05T00:00:00.000Z'),
      type: 'Events',
      placeId: crypto.randomUUID(),
    });

    const ownerVisits = await getVisitsByUser(ownerId);
    expect(ownerVisits).toEqual([]);
  });

  it('filters by tag name deterministically', async () => {
    await createEvent({
      title: 'Tagged Alpha',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['alpha'],
    });
    await createEvent({
      title: 'Tagged Beta',
      userId: ownerId,
      date: new Date('2026-03-05T00:00:00.000Z'),
      type: 'Events',
      tags: ['beta'],
    });

    const filtered = await getEvents({ tagNames: ['alpha'], sortBy: 'date-asc' });

    expect(filtered.map((event) => event.title)).toEqual(['Tagged Alpha']);
  });
});
