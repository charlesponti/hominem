/**
 * Calendar service - manages events and attendees
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, desc, asc, gte, lte } from 'drizzle-orm'
import type { Database } from './client'
import { calendarEvents, calendarAttendees } from '../schema/calendar'
import type { UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'

// Local types for this service
type CalendarEvent = typeof calendarEvents.$inferSelect
type CalendarEventInsert = typeof calendarEvents.$inferInsert
type CalendarEventUpdate = Partial<Omit<CalendarEventInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>

type CalendarAttendee = typeof calendarAttendees.$inferSelect
type CalendarAttendeeInsert = typeof calendarAttendees.$inferInsert

/**
 * Internal helper: verify user ownership of event
 * @throws ForbiddenError if event doesn't belong to user
 */
async function getEventWithOwnershipCheck(db: Database, eventId: string, userId: UserId): Promise<CalendarEvent> {
  const event = await db.query.calendarEvents.findFirst({
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
  },
  db?: Database
): Promise<CalendarEvent[]> {
  const filters: any[] = [eq(calendarEvents.userId, String(userId))]

  if (options?.startTime) {
    filters.push(gte(calendarEvents.startTime, options.startTime))
  }
  if (options?.endTime) {
    filters.push(lte(calendarEvents.startTime, options.endTime))
  }

  const results = await db!.query.calendarEvents.findMany({
    where: and(...filters),
    orderBy: [asc(calendarEvents.startTime)],
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
  const event = await db!.query.calendarEvents.findFirst({
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
  const result = await db!.insert(calendarEvents)
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
  // Verify ownership first
  await getEventWithOwnershipCheck(db!, eventId, userId)

  const result = await db!.update(calendarEvents)
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
  // Verify ownership first
  await getEventWithOwnershipCheck(db!, eventId, userId)

  // Delete all attendees first
  await db!.delete(calendarAttendees).where(eq(calendarAttendees.eventId, eventId))

  // Delete the event
  const result = await db!.delete(calendarEvents).where(eq(calendarEvents.id, eventId)).returning()

  return result.length > 0
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
  // Verify event ownership
  await getEventWithOwnershipCheck(db!, eventId, userId)

  const results = await db!.query.calendarAttendees.findMany({
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
  // Verify event ownership
  await getEventWithOwnershipCheck(db!, eventId, userId)

  const result = await db!.insert(calendarAttendees)
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
  // Verify event ownership
  await getEventWithOwnershipCheck(db!, eventId, userId)

  const result = await db!.delete(calendarAttendees)
    .where(eq(calendarAttendees.id, attendeeId))
    .returning()

  return result.length > 0
}
