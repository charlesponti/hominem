import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { getAccountByUserAndProvider } from '@hominem/auth/server'
import { GoogleCalendarService } from '@hominem/db/google-calendar.service'

import {
  addEventAttendee,
  createEvent,
  deleteEvent,
  getEvent,
  listEventAttendees,
  listEvents,
  replaceEventAttendees,
  updateEvent,
} from '@hominem/db/services/calendar.service'
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
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../errors'

export const calendarRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', ListEventsFilterSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof listEvents>[0]
    const query = c.req.valid('query')

    const filters: NonNullable<Parameters<typeof listEvents>[1]> = {}
    if (query.startTime !== undefined) filters.startTime = query.startTime
    if (query.endTime !== undefined) filters.endTime = query.endTime

    const rawLimit = c.req.query('limit')
    if (rawLimit !== undefined) {
      const parsedLimit = Number.parseInt(rawLimit, 10)
      if (!Number.isNaN(parsedLimit)) {
        filters.limit = parsedLimit
      }
    }

    const rawOffset = c.req.query('offset')
    if (rawOffset !== undefined) {
      const parsedOffset = Number.parseInt(rawOffset, 10)
      if (!Number.isNaN(parsedOffset)) {
        filters.offset = parsedOffset
      }
    }

    const events = await listEvents(userId, filters)
    return c.json({ success: true, data: events })
  })
  .get('/:id', async (c) => {
    const userId = c.get('userId') as Parameters<typeof getEvent>[1]
    const id = c.req.param('id') as Parameters<typeof getEvent>[0]

    const event = await getEvent(id, userId)
    if (!event) {
      throw new NotFoundError('Event not found')
    }

    return c.json({ success: true, data: event })
  })
  .post('/', zValidator('json', CreateEventInputSchema), async (c) => {
    const userId = c.get('userId') as Parameters<typeof createEvent>[0]
    const data = c.req.valid('json')

    const newEvent = await createEvent(userId, {
      eventType: data.eventType,
      title: data.title,
      startTime: data.startTime,
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.allDay !== undefined ? { allDay: data.allDay } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    })

    return c.json({ success: true, data: newEvent }, 201)
  })
  .patch('/:id', zValidator('json', UpdateEventInputSchema), async (c) => {
    try {
      const userId = c.get('userId') as Parameters<typeof updateEvent>[1]
      const id = c.req.param('id') as Parameters<typeof updateEvent>[0]
      const data = c.req.valid('json')

      const updateData: Parameters<typeof updateEvent>[2] = {}
      if (data.eventType !== undefined) updateData.eventType = data.eventType
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.startTime !== undefined) updateData.startTime = data.startTime
      if (data.endTime !== undefined) updateData.endTime = data.endTime
      if (data.allDay !== undefined) updateData.allDay = data.allDay
      if (data.location !== undefined) updateData.location = data.location
      if (data.color !== undefined) updateData.color = data.color

      const updatedEvent = await updateEvent(id, userId, updateData)
      if (!updatedEvent) {
        throw new NotFoundError('Event not found or access denied')
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
      const userId = c.get('userId') as Parameters<typeof deleteEvent>[1]
      const id = c.req.param('id') as Parameters<typeof deleteEvent>[0]

      const deleted = await deleteEvent(id, userId)
      if (!deleted) {
        throw new NotFoundError('Event not found or access denied')
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
      const userId = c.get('userId') as Parameters<typeof listEventAttendees>[1]
      const id = c.req.param('id') as Parameters<typeof listEventAttendees>[0]

      const attendees = await listEventAttendees(id, userId)
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
      const userId = c.get('userId') as Parameters<typeof addEventAttendee>[2]
      const id = c.req.param('id') as Parameters<typeof addEventAttendee>[0]
      const data = c.req.valid('json')

      const attendee = await addEventAttendee(id, data.personId, userId)
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
      const userId = c.get('userId') as Parameters<typeof replaceEventAttendees>[2]
      const id = c.req.param('id') as Parameters<typeof replaceEventAttendees>[0]
      const data = c.req.valid('json')

      const attendees = await replaceEventAttendees(id, data.personIds, userId)
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
        'Google Calendar access token not found in session. Please reconnect your Google account.',
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
        'Google Calendar access token not found in session. Please reconnect your Google account.',
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
