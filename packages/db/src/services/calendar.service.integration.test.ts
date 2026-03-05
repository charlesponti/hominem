import crypto from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db, eq, inArray, sql } from '../index'
import { calendarAttendees, calendarEvents, persons } from '../schema/calendar'
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '../test/services/_shared/harness'
import { ForbiddenError } from './_shared/errors'
import type { UserId } from './_shared/ids'
import { brandId } from './_shared/ids'
import {
  addEventAttendee,
  createEvent,
  deleteEvent,
  getEvent,
  getSyncStatus,
  listEventAttendees,
  listEvents,
  removeEventAttendee,
  replaceEventAttendees,
  updateEvent,
} from './calendar.service'

const dbAvailable = await isIntegrationDatabaseAvailable()
const nextUserId = createDeterministicIdFactory('db.calendar.integration')

describe.skipIf(!dbAvailable)('calendar.service integration', () => {
  let ownerId: UserId
  let otherUserId: UserId

  const cleanupForUsers = async (userIds: string[]): Promise<void> => {
    if (userIds.length === 0) {
      return
    }

    await db.delete(calendarEvents).where(inArray(calendarEvents.userId, userIds)).catch(() => {})
    await db.delete(persons).where(inArray(persons.ownerUserId, userIds)).catch(() => {})
    for (const userId of userIds) {
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {})
    }
  }

  beforeEach(async () => {
    ownerId = brandId<UserId>(nextUserId())
    otherUserId = brandId<UserId>(nextUserId())
    await cleanupForUsers([String(ownerId), String(otherUserId)])
    await ensureIntegrationUsers([
      { id: String(ownerId), name: 'Calendar User' },
      { id: String(otherUserId), name: 'Calendar User' },
    ])
  })

  it('lists only owner events ordered by startTime asc with deterministic pagination', async () => {
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Late',
      startTime: '2026-03-04T12:00:00.000Z',
    })
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Early',
      startTime: '2026-03-04T08:00:00.000Z',
    })
    await createEvent(otherUserId, {
      eventType: 'meeting',
      title: 'Other User',
      startTime: '2026-03-04T07:00:00.000Z',
    })

    const page = await listEvents(ownerId, { limit: 1, offset: 0 })
    const all = await listEvents(ownerId)

    expect(all.map((event) => event.title)).toEqual(['Early', 'Late'])
    expect(page).toHaveLength(1)
    expect(page[0]?.title).toBe('Early')
  })

  it('enforces ownership for get/update/delete', async () => {
    const created = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Owned',
      startTime: '2026-03-04T10:00:00.000Z',
    })

    const otherRead = await getEvent(created.id, otherUserId)
    expect(otherRead).toBeNull()

    await expect(updateEvent(created.id, otherUserId, { title: 'Nope' })).rejects.toBeInstanceOf(
      ForbiddenError,
    )
    await expect(deleteEvent(created.id, otherUserId)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('supports attendee lifecycle and cascades attendee rows on delete', async () => {
    const created = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'With Attendee',
      startTime: '2026-03-04T11:00:00.000Z',
    })

    const personId = crypto.randomUUID()
    await db.insert(persons).values({
      id: personId,
      ownerUserId: String(ownerId),
      personType: 'contact',
      firstName: 'Pat',
    })

    const attendee = await addEventAttendee(created.id, personId, ownerId)
    const attendees = await listEventAttendees(created.id, ownerId)

    expect(attendee.eventId).toBe(created.id)
    expect(attendees).toHaveLength(1)
    expect(attendees[0]?.personId).toBe(personId)

    const removed = await removeEventAttendee(attendee.id, created.id, ownerId)
    expect(removed).toBe(true)

    const attendeeAgain = await addEventAttendee(created.id, personId, ownerId)
    await expect(removeEventAttendee(attendeeAgain.id, created.id, otherUserId)).rejects.toBeInstanceOf(
      ForbiddenError,
    )

    const deleted = await deleteEvent(created.id, ownerId)
    expect(deleted).toBe(true)

    const remainingAttendees = await db
      .select()
      .from(calendarAttendees)
      .where(eq(calendarAttendees.eventId, created.id))
    expect(remainingAttendees).toHaveLength(0)
  })

  it('replaces attendee set with idempotent overwrite semantics', async () => {
    const created = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Replace Attendees',
      startTime: '2026-03-04T13:00:00.000Z',
    })

    const personA = crypto.randomUUID()
    const personB = crypto.randomUUID()
    const personC = crypto.randomUUID()

    await db.insert(persons).values([
      { id: personA, ownerUserId: String(ownerId), personType: 'contact', firstName: 'A' },
      { id: personB, ownerUserId: String(ownerId), personType: 'contact', firstName: 'B' },
      { id: personC, ownerUserId: String(ownerId), personType: 'contact', firstName: 'C' },
    ])

    const firstReplace = await replaceEventAttendees(created.id, [personA, personB, personB], ownerId)
    expect(new Set(firstReplace.map((row) => row.personId))).toEqual(new Set([personA, personB]))

    const secondReplace = await replaceEventAttendees(created.id, [personC], ownerId)
    expect(new Set(secondReplace.map((row) => row.personId))).toEqual(new Set([personC]))

    const loaded = await listEventAttendees(created.id, ownerId)
    expect(new Set(loaded.map((row) => row.personId))).toEqual(new Set([personC]))

    await expect(replaceEventAttendees(created.id, [personA], otherUserId)).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })

  it('rolls back attendee replacement when any inserted attendee is invalid', async () => {
    const created = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Transactional Replace',
      startTime: '2026-03-04T14:00:00.000Z',
    })

    const validPerson = crypto.randomUUID()
    await db.insert(persons).values({
      id: validPerson,
      ownerUserId: String(ownerId),
      personType: 'contact',
      firstName: 'Valid',
    })

    await replaceEventAttendees(created.id, [validPerson], ownerId)

    await expect(
      replaceEventAttendees(created.id, [crypto.randomUUID(), validPerson], ownerId),
    ).rejects.toThrow()

    const afterFailure = await listEventAttendees(created.id, ownerId)
    expect(afterFailure).toHaveLength(1)
    expect(afterFailure[0]?.personId).toBe(validPerson)
  })

  it('applies start/end filters on startTime', async () => {
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Before Window',
      startTime: '2026-03-04T05:00:00.000Z',
    })
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'In Window',
      startTime: '2026-03-04T09:00:00.000Z',
    })
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'After Window',
      startTime: '2026-03-04T15:00:00.000Z',
    })

    const filtered = await listEvents(ownerId, {
      startTime: '2026-03-04T08:00:00.000Z',
      endTime: '2026-03-04T12:00:00.000Z',
    })

    expect(filtered.map((event) => event.title)).toEqual(['In Window'])
  })

  it('clamps limit and offset query controls', async () => {
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Clamp 1',
      startTime: '2026-03-04T07:00:00.000Z',
    })
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Clamp 2',
      startTime: '2026-03-04T08:00:00.000Z',
    })

    const minimum = await listEvents(ownerId, { limit: 0, offset: -10 })
    expect(minimum).toHaveLength(1)
    expect(minimum[0]?.title).toBe('Clamp 1')
  })

  it('returns google sync status scoped to owner', async () => {
    await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Manual Event',
      startTime: '2026-03-04T08:00:00.000Z',
    })

    const oldSynced = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'Old Synced',
      startTime: '2026-03-04T09:00:00.000Z',
    })
    await db
      .update(calendarEvents)
      .set({
        source: 'google_calendar',
        metadata: { lastSyncedAt: '2026-03-04T09:00:00.000Z', syncError: null },
      })
      .where(eq(calendarEvents.id, oldSynced.id))

    const newSynced = await createEvent(ownerId, {
      eventType: 'meeting',
      title: 'New Synced',
      startTime: '2026-03-04T10:00:00.000Z',
    })
    await db
      .update(calendarEvents)
      .set({
        source: 'google_calendar',
        metadata: { lastSyncedAt: '2026-03-04T10:00:00.000Z', syncError: 'Rate limited' },
      })
      .where(eq(calendarEvents.id, newSynced.id))

    const otherSynced = await createEvent(otherUserId, {
      eventType: 'meeting',
      title: 'Other User Synced',
      startTime: '2026-03-04T11:00:00.000Z',
    })
    await db
      .update(calendarEvents)
      .set({
        source: 'google_calendar',
        metadata: { lastSyncedAt: '2026-03-04T11:00:00.000Z', syncError: null },
      })
      .where(eq(calendarEvents.id, otherSynced.id))

    const status = await getSyncStatus(ownerId)

    expect(status.eventCount).toBe(2)
    expect(status.lastSyncedAt).toBe('2026-03-04T10:00:00.000Z')
    expect(status.syncError).toBe('Rate limited')
  })
})
