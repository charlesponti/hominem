import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { getAccountByUserAndProvider } from '@hominem/auth/server'
import { GoogleCalendarService } from '@hominem/db/google-calendar.service'

import { db, ForbiddenError, NotFoundError } from '@hominem/db'
import type { AppContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  AddEventAttendeeInputSchema,
  CreateEventInputSchema,
  GoogleCalendarSyncQuerySchema,
  ListEventsFilterSchema,
  ReplaceEventAttendeesInputSchema,
  UpdateEventInputSchema,
} from '../schemas/calendar.schema'
import { UnauthorizedError } from '../errors'

async function getEventWithOwnershipCheck(id: string, userId: string) {
  const event = await db
    .selectFrom('calendar_events')
    .selectAll()
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .executeTakeFirst()

  if (!event) {
    throw new ForbiddenError('Event not found or access denied')
  }
  return event
}

export const calendarRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', ListEventsFilterSchema), async (c) => {
    const userId = c.get('userId')!
    const query = c.req.valid('query')

    let dbQuery = db.selectFrom('calendar_events').selectAll().where('user_id', '=', userId)

    if (query.startTime) {
      dbQuery = dbQuery.where('start_time', '>=', query.startTime as any)
    }

    if (query.endTime) {
      dbQuery = dbQuery.where('end_time', '<=', query.endTime as any)
    }

    const offset = query.offset ?? 0
    const limit = query.limit ?? 50

    const events = await dbQuery
      .orderBy('start_time', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()

    return c.json({ success: true, data: events })
  })
  .get('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const event = await getEventWithOwnershipCheck(id, userId)
    return c.json({ success: true, data: event })
  })
  .post('/', zValidator('json', CreateEventInputSchema), async (c) => {
    const userId = c.get('userId')!
    const data = c.req.valid('json')

    const newEvent = await db
      .insertInto('calendar_events')
      .values({
        user_id: userId,
        event_type: data.eventType,
        title: data.title,
        start_time: data.startTime as any,
        end_time: data.endTime ? (data.endTime as any) : null,
        description: data.description ?? null,
        all_day: data.allDay ?? null,
        location: data.location ?? null,
        color: data.color ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    return c.json({ success: true, data: newEvent }, 201)
  })
  .patch('/:id', zValidator('json', UpdateEventInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      // Verify ownership
      await getEventWithOwnershipCheck(id, userId)

      const updateData: any = {}
      if (data.eventType !== undefined) updateData.event_type = data.eventType
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description ?? null
      if (data.startTime !== undefined) updateData.start_time = data.startTime
      if (data.endTime !== undefined) updateData.end_time = data.endTime ?? null
      if (data.allDay !== undefined) updateData.all_day = data.allDay ?? null
      if (data.location !== undefined) updateData.location = data.location ?? null
      if (data.color !== undefined) updateData.color = data.color ?? null

      const updatedEvent = await db
        .updateTable('calendar_events')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst()

      if (!updatedEvent) {
        throw new NotFoundError('Event not found')
      }

      return c.json({ success: true, data: updatedEvent })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      // Verify ownership
      await getEventWithOwnershipCheck(id, userId)

      const result = await db
        .deleteFrom('calendar_events')
        .where('id', '=', id)
        .executeTakeFirst()

      if ((result.numDeletedRows ?? 0n) === 0n) {
        throw new NotFoundError('Event not found')
      }

      return c.json({ success: true, data: { id } })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .get('/:id/attendees', async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')

      // Verify event exists and user owns it
      await getEventWithOwnershipCheck(id, userId)

      const attendees = await db
        .selectFrom('calendar_attendees')
        .selectAll()
        .where('event_id', '=', id)
        .orderBy('created_at', 'asc')
        .execute()

      return c.json({ success: true, data: attendees })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .post('/:id/attendees', zValidator('json', AddEventAttendeeInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      // Verify event exists and user owns it
      await getEventWithOwnershipCheck(id, userId)

      const attendee = await db
        .insertInto('calendar_attendees')
        .values({
          event_id: id,
          person_id: data.personId,
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      return c.json({ success: true, data: attendee }, 201)
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .put('/:id/attendees', zValidator('json', ReplaceEventAttendeesInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!
      const id = c.req.param('id')
      const data = c.req.valid('json')

      // Verify event exists and user owns it
      await getEventWithOwnershipCheck(id, userId)

      // Delete existing attendees
      await db.deleteFrom('calendar_attendees').where('event_id', '=', id).execute()

      // Insert new attendees
      let attendees: any[] = []
      if (data.personIds && data.personIds.length > 0) {
        attendees = await db
          .insertInto('calendar_attendees')
          .values(data.personIds.map((personId) => ({ event_id: id, person_id: personId })))
          .returningAll()
          .execute()
      }

      return c.json({ success: true, data: attendees })
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error
      }
      throw error
    }
  })
  .get('/google/calendars', async (c) => {
    const userId = c.get('userId')!
    const account = await getAccountByUserAndProvider(userId, 'google')
    if (!(account?.accessToken || account?.refreshToken)) {
      throw new UnauthorizedError(
        'Google Calendar access token not found in session. Please reconnect your Google account.'
      )
    }

    const googleService = new GoogleCalendarService(userId, {
      accessToken: account.accessToken ?? '',
      refreshToken: account.refreshToken || undefined,
    })

    const calendars = await googleService.getCalendarList()
    return c.json({ success: true, data: calendars })
  })
  .post('/google/sync', zValidator('query', GoogleCalendarSyncQuerySchema), async (c) => {
    const userId = c.get('userId')!
    const account = await getAccountByUserAndProvider(userId, 'google')
    if (!(account?.accessToken || account?.refreshToken)) {
      throw new UnauthorizedError(
        'Google Calendar access token not found in session. Please reconnect your Google account.'
      )
    }

    const googleService = new GoogleCalendarService(userId, {
      accessToken: account.accessToken ?? '',
      refreshToken: account.refreshToken || undefined,
    })

    const { calendarId, timeMin, timeMax } = c.req.valid('query')

    const result = await googleService.syncGoogleCalendarEvents(calendarId, timeMin, timeMax)

    return c.json({
      success: true,
      data: {
        syncedEvents: result.created + result.updated + result.deleted,
        message: `Successfully synced ${result.created} created, ${result.updated} updated, and ${result.deleted} deleted events.`,
      },
    })
  })
  .get('/sync/status', async (c) => {
    const userId = c.get('userId')!
    const account = await getAccountByUserAndProvider(userId, 'google')

    if (!(account?.accessToken || account?.refreshToken)) {
      return c.json({
        success: true,
        data: {
          lastSyncedAt: null,
          syncError: null,
          eventCount: 0,
          connected: false,
        },
      })
    }

    const googleService = new GoogleCalendarService(userId, {
      accessToken: account.accessToken ?? '',
      refreshToken: account.refreshToken || undefined,
    })
    const status = await googleService.getSyncStatus()

    return c.json({
      success: true,
      data: {
        lastSyncedAt: status.lastSyncedAt ? status.lastSyncedAt.toISOString() : null,
        syncError: status.syncError,
        eventCount: status.eventCount,
        connected: true,
      },
    })
  })
