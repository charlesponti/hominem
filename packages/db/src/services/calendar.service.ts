/**
 * Calendar service - manages events and attendees
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, asc, gte, lte, type SQL } from 'drizzle-orm'
import type { Database } from './client'
import { db as defaultDb } from '../index'
import { calendarEvents, calendarAttendees } from '../schema/calendar'
import type { UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'

// Local types for this service
type CalendarEvent = typeof calendarEvents.$inferSelect
type CalendarEventInsert = typeof calendarEvents.$inferInsert
type CalendarEventUpdate = Partial<Omit<CalendarEventInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>

type CalendarAttendee = typeof calendarAttendees.$inferSelect

export interface CalendarSyncStatus {
  lastSyncedAt: string | null
  syncError: string | null
  eventCount: number
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

interface CalendarSyncMetadata {
  lastSyncedAt?: string | null
  syncError?: string | null
}

function parseCalendarSyncMetadata(value: CalendarEvent['metadata']): CalendarSyncMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const metadata = value as Record<string, JsonValue>
  const result: CalendarSyncMetadata = {}
  if (typeof metadata.lastSyncedAt === 'string' || metadata.lastSyncedAt === null) {
    result.lastSyncedAt = metadata.lastSyncedAt
  }
  if (typeof metadata.syncError === 'string' || metadata.syncError === null) {
    result.syncError = metadata.syncError
  }
  return result
}

/**
 * Internal helper: verify user ownership of event
 * @throws ForbiddenError if event doesn't belong to user
 */
async function getEventWithOwnershipCheck(db: Database | undefined, eventId: string, userId: UserId): Promise<CalendarEvent> {
  const database = db || (defaultDb as any as Database)
  const event = await database.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, String(userId))),
  })

  if (!event) {
    throw new ForbiddenError(`Event not found or access denied`, 'ownership')
  }

  return event
}

/**
 * List user's events with optional time filtering
 *
 * @param userId - User ID (enforced in all queries)
 * @param options - Optional filters: startTime, endTime
 * @param db - Database context
 * @returns Array of events (empty if none)
 */
export async function listEvents(
  userId: UserId,
  options?: {
    startTime?: string
    endTime?: string
    limit?: number
    offset?: number
  },
  db?: Database
): Promise<CalendarEvent[]> {
  const database = db || (defaultDb as any as Database)
  const filters: SQL[] = [eq(calendarEvents.userId, String(userId))]
  const clampedLimit = options?.limit === undefined
    ? undefined
    : Math.max(1, Math.min(100, Math.trunc(options.limit)))
  const clampedOffset = options?.offset === undefined
    ? undefined
    : Math.max(0, Math.trunc(options.offset))

  if (options?.startTime) {
    filters.push(gte(calendarEvents.startTime, options.startTime))
  }
  if (options?.endTime) {
    filters.push(lte(calendarEvents.startTime, options.endTime))
  }

  const results = await database.query.calendarEvents.findMany({
    where: and(...filters),
    orderBy: [asc(calendarEvents.startTime)],
    ...(clampedLimit !== undefined ? { limit: clampedLimit } : {}),
    ...(clampedOffset !== undefined ? { offset: clampedOffset } : {}),
  })

  return results
}

/**
 * Get a single event by ID
 *
 * @param eventId - Event ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Event or null if not found
 */
export async function getEvent(
  eventId: string,
  userId: UserId,
  db?: Database
): Promise<CalendarEvent | null> {
  const database = db || (defaultDb as any as Database)
  const event = await database.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, String(userId))),
  })

  return event ?? null
}

/**
 * Create a new event
 *
 * @param userId - User ID
 * @param input - Event data
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created event
 */
export async function createEvent(
  userId: UserId,
  input: {
    eventType: string
    title: string
    description?: string | null
    startTime: string
    endTime?: string | null
    allDay?: boolean
    location?: string | null
    color?: string | null
  },
  db?: Database
): Promise<CalendarEvent> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(calendarEvents)
    .values({
      userId: String(userId),
      eventType: input.eventType,
      title: input.title,
      description: input.description ?? null,
      startTime: input.startTime,
      endTime: input.endTime ?? null,
      allDay: input.allDay ?? false,
      location: input.location ?? null,
      color: input.color ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create event')
  }

  return result[0]
}

/**
 * Update an existing event
 *
 * @param eventId - Event ID
 * @param userId - User ID (enforces ownership)
 * @param input - Partial event data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @returns Updated event or null if already deleted
 */
export async function updateEvent(
  eventId: string,
  userId: UserId,
  input: CalendarEventUpdate,
  db?: Database
): Promise<CalendarEvent | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getEventWithOwnershipCheck(database, eventId, userId)

  const result = await database.update(calendarEvents)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(eq(calendarEvents.id, eventId))
    .returning()

  return result[0] ?? null
}

/**
 * Delete an event
 *
 * @param eventId - Event ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @returns True if deleted, false if already deleted
 */
export async function deleteEvent(
  eventId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  return database.transaction(async (tx) => {
    await getEventWithOwnershipCheck(tx as Database, eventId, userId)
    await tx.delete(calendarAttendees).where(eq(calendarAttendees.eventId, eventId))
    const result = await tx.delete(calendarEvents).where(eq(calendarEvents.id, eventId)).returning()
    return result.length > 0
  })
}

/**
 * List attendees for an event
 *
 * @param eventId - Event ID
 * @param userId - User ID (enforces ownership of event)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @returns Array of attendees
 */
export async function listEventAttendees(
  eventId: string,
  userId: UserId,
  db?: Database
): Promise<CalendarAttendee[]> {
  const database = db || (defaultDb as any as Database)
  // Verify event ownership
  await getEventWithOwnershipCheck(database, eventId, userId)

  const results = await database.query.calendarAttendees.findMany({
    where: eq(calendarAttendees.eventId, eventId),
  })

  return results
}

/**
 * Add an attendee to an event
 *
 * @param eventId - Event ID
 * @param personId - Person ID
 * @param userId - User ID (enforces ownership of event)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @throws Error if attendee add fails
 * @returns Added attendee
 */
export async function addEventAttendee(
  eventId: string,
  personId: string | null,
  userId: UserId,
  db?: Database
): Promise<CalendarAttendee> {
  const database = db || (defaultDb as any as Database)
  // Verify event ownership
  await getEventWithOwnershipCheck(database, eventId, userId)

  const result = await database.insert(calendarAttendees)
    .values({
      eventId,
      personId,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to add attendee')
  }

  return result[0]
}

/**
 * Replace attendee set for an event
 *
 * Full overwrite semantics:
 * - Existing attendees are deleted
 * - Provided person IDs are inserted as the complete new set
 * - Duplicate IDs are deduplicated
 *
 * @param eventId - Event ID
 * @param personIds - Full attendee person ID set
 * @param userId - User ID (enforces ownership of event)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @returns Final attendee list for event
 */
export async function replaceEventAttendees(
  eventId: string,
  personIds: string[],
  userId: UserId,
  db?: Database
): Promise<CalendarAttendee[]> {
  const database = db || (defaultDb as any as Database)
  await getEventWithOwnershipCheck(database, eventId, userId)

  const uniquePersonIds = Array.from(new Set(personIds))

  return database.transaction(async (tx) => {
    await tx.delete(calendarAttendees).where(eq(calendarAttendees.eventId, eventId))

    if (uniquePersonIds.length > 0) {
      await tx.insert(calendarAttendees).values(
        uniquePersonIds.map((personId) => ({
          eventId,
          personId,
        })),
      )
    }

    const attendees = await tx.query.calendarAttendees.findMany({
      where: eq(calendarAttendees.eventId, eventId),
      orderBy: [asc(calendarAttendees.createdAt), asc(calendarAttendees.id)],
    })

    return attendees
  })
}

/**
 * Remove an attendee from an event
 *
 * @param attendeeId - Attendee ID
 * @param eventId - Event ID (for ownership verification)
 * @param userId - User ID (enforces ownership of event)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the event
 * @returns True if removed, false if already removed
 */
export async function removeEventAttendee(
  attendeeId: string,
  eventId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  // Verify event ownership
  await getEventWithOwnershipCheck(database, eventId, userId)

  const result = await database.delete(calendarAttendees)
    .where(eq(calendarAttendees.id, attendeeId))
    .returning()

  return result.length > 0
}

export async function getSyncStatus(
  userId: UserId,
  db?: Database
): Promise<CalendarSyncStatus> {
  const database = db || (defaultDb as any as Database)
  const syncedEvents = await database.query.calendarEvents.findMany({
    where: and(eq(calendarEvents.userId, String(userId)), eq(calendarEvents.source, 'google_calendar')),
  })
  let latestSyncedAt: string | null = null
  let latestSyncError: string | null = null

  for (const event of syncedEvents) {
    const metadata = parseCalendarSyncMetadata(event.metadata)
    if (!metadata.lastSyncedAt) {
      continue
    }
    if (!latestSyncedAt || metadata.lastSyncedAt > latestSyncedAt) {
      latestSyncedAt = metadata.lastSyncedAt
      latestSyncError = metadata.syncError ?? null
    }
  }

  return {
    lastSyncedAt: latestSyncedAt,
    syncError: latestSyncError,
    eventCount: syncedEvents.length,
  }
}
