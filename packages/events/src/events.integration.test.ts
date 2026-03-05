import crypto from 'node:crypto'

import { db } from '@hominem/db'
import { eq, or, sql } from '@hominem/db'
import { events, eventsTags, eventsUsers } from '@hominem/db/schema/calendar'
import { contacts } from '@hominem/db/schema/contacts'
import { tags } from '@hominem/db/schema/tags'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  getVisitsByUser,
  updateEvent,
} from './event-core.service'

async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`)
    return true
  } catch {
    console.warn('Database not available, skipping events.integration tests. Start test DB on port 4433.')
    return false
  }
}

const dbAvailable = await isDatabaseAvailable()

describe.skipIf(!dbAvailable)('events integration', () => {
  let ownerId: string
  let otherUserId: string
  let ownerContactId: string

  const createUser = async (id: string, name: string): Promise<void> => {
    await db.execute(
      sql`insert into users (id, email, name) values (${id}, ${`${id}@example.com`}, ${name}) on conflict (id) do nothing`,
    )
  }

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    if (userIds.length === 0) {
      return
    }

    if (userIds.length === 1) {
      const userId = userIds[0]!
      await db.delete(events).where(eq(events.userId, userId)).catch(() => {})
      await db.delete(tags).where(eq(tags.userId, userId)).catch(() => {})
      await db.delete(contacts).where(eq(contacts.userId, userId)).catch(() => {})
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
      return
    }

    const [firstUserId, secondUserId] = userIds
    await db
      .delete(events)
      .where(or(eq(events.userId, firstUserId!), eq(events.userId, secondUserId!)))
      .catch(() => {})
    await db
      .delete(tags)
      .where(or(eq(tags.userId, firstUserId!), eq(tags.userId, secondUserId!)))
      .catch(() => {})
    await db
      .delete(contacts)
      .where(or(eq(contacts.userId, firstUserId!), eq(contacts.userId, secondUserId!)))
      .catch(() => {})
    await db.execute(sql`delete from users where id = ${firstUserId} or id = ${secondUserId}`).catch(() => {})
  }

  beforeEach(async () => {
    ownerId = crypto.randomUUID()
    otherUserId = crypto.randomUUID()
    await cleanupForUsers([ownerId, otherUserId])
    await createUser(ownerId, 'Events Owner')
    await createUser(otherUserId, 'Events Other User')

    ownerContactId = crypto.randomUUID()
    await db.insert(contacts).values({
      id: ownerContactId,
      userId: ownerId,
      firstName: 'Companion',
      lastName: 'One',
      email: `${ownerContactId}@example.com`,
    })
  })

  it('creates and fetches an event with tags and people', async () => {
    const created = await createEvent({
      title: 'Integration Event',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['family', 'weekend'],
      people: [ownerContactId],
    })

    const loaded = await getEventById(created.id)

    expect(loaded).not.toBeNull()
    expect(loaded?.tags.map((tag) => tag.name).sort()).toEqual(['family', 'weekend'])
    expect(loaded?.people.map((person) => person.id)).toEqual([ownerContactId])
  })

  it('updates event title and synchronizes tag set', async () => {
    const created = await createEvent({
      title: 'Before Title',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['old-tag'],
    })

    const updated = await updateEvent(created.id, {
      title: 'After Title',
      tags: ['new-tag'],
    })

    expect(updated?.title).toBe('After Title')
    expect(updated?.tags.map((tag) => tag.name)).toEqual(['new-tag'])
  })

  it('deletes event and clears junction records', async () => {
    const created = await createEvent({
      title: 'Delete Me',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['cleanup'],
      people: [ownerContactId],
    })

    const deleted = await deleteEvent(created.id)

    const eventAfterDelete = await getEventById(created.id)
    const tagsAfterDelete = await db
      .select()
      .from(eventsTags)
      .where(eq(eventsTags.eventId, created.id))
    const peopleAfterDelete = await db
      .select()
      .from(eventsUsers)
      .where(eq(eventsUsers.eventId, created.id))

    expect(deleted).toBe(true)
    expect(eventAfterDelete).toBeNull()
    expect(tagsAfterDelete).toHaveLength(0)
    expect(peopleAfterDelete).toHaveLength(0)
  })

  it('returns visits scoped to requesting user only', async () => {
    await createEvent({
      title: 'Owner Visit',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      placeId: crypto.randomUUID(),
    })

    await createEvent({
      title: 'Other Visit',
      userId: otherUserId,
      date: new Date('2026-03-05T00:00:00.000Z'),
      type: 'Events',
      placeId: crypto.randomUUID(),
    })

    const ownerVisits = await getVisitsByUser(ownerId)
    const ownerVisitUserIds = new Set(ownerVisits.map((visit) => visit.userId))

    expect(ownerVisits.length).toBeGreaterThan(0)
    expect(ownerVisitUserIds).toEqual(new Set([ownerId]))
  })

  it('filters by tag name deterministically', async () => {
    await createEvent({
      title: 'Tagged Alpha',
      userId: ownerId,
      date: new Date('2026-03-04T00:00:00.000Z'),
      type: 'Events',
      tags: ['alpha'],
    })
    await createEvent({
      title: 'Tagged Beta',
      userId: ownerId,
      date: new Date('2026-03-05T00:00:00.000Z'),
      type: 'Events',
      tags: ['beta'],
    })

    const filtered = await getEvents({ tagNames: ['alpha'], sortBy: 'date-asc' })

    expect(filtered.map((event) => event.title)).toEqual(['Tagged Alpha'])
  })
})
