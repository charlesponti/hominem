import { logger } from '@ponti/utils/logger'
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import googleService from './auth'

interface SearchEventsQuery {
  q?: string
  timeMin?: string
  timeMax?: string
  calendarId?: string
}

interface CreateEventBody {
  calendarId: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: { email: string }[]
}

interface UpdateEventBody extends Partial<CreateEventBody> {
  eventId: string
}

const calendarPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Search calendar events
  fastify.get('/calendar/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    try {
      const { q, timeMin, timeMax, calendarId = 'primary' } = request.query as SearchEventsQuery
      const calendar = await googleService.getCalendarServiceForUser(request.userId)

      const response = await calendar.events.list({
        calendarId,
        q,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return { events: response.data.items }
    } catch (error) {
      logger.error('Error fetching calendar events:', error)
      return reply.status(500).send({ error: 'Failed to fetch calendar events' })
    }
  })

  // Create calendar event
  fastify.post('/calendar/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    try {
      const eventData = request.body as CreateEventBody
      const calendar = await googleService.getCalendarServiceForUser(request.userId)

      const response = await calendar.events.insert({
        calendarId: eventData.calendarId,
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: eventData.start,
          end: eventData.end,
          location: eventData.location,
          attendees: eventData.attendees,
        },
      })

      return { event: response.data }
    } catch (error) {
      logger.error('Error creating calendar event:', error)
      return reply.status(500).send({ error: 'Failed to create calendar event' })
    }
  })

  // Update calendar event
  fastify.patch(
    '/calendar/events/:eventId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      try {
        const { eventId } = request.params as { eventId: string }
        const updateData = request.body as UpdateEventBody
        const calendar = await googleService.getCalendarServiceForUser(request.userId)

        const response = await calendar.events.patch({
          calendarId: updateData.calendarId || 'primary',
          eventId,
          requestBody: {
            summary: updateData.summary,
            description: updateData.description,
            start: updateData.start,
            end: updateData.end,
            location: updateData.location,
            attendees: updateData.attendees,
          },
        })

        return { event: response.data }
      } catch (error) {
        logger.error('Error updating calendar event:', error)
        return reply.status(500).send({ error: 'Failed to update calendar event' })
      }
    }
  )

  // Delete calendar event
  fastify.delete(
    '/calendar/events/:eventId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      try {
        const { eventId } = request.params as { eventId: string }
        const { calendarId = 'primary' } = request.query as { calendarId?: string }
        const calendar = await googleService.getCalendarServiceForUser(request.userId)

        await calendar.events.delete({
          calendarId,
          eventId,
        })

        return { success: true }
      } catch (error) {
        logger.error('Error deleting calendar event:', error)
        return reply.status(500).send({ error: 'Failed to delete calendar event' })
      }
    }
  )

  // List calendars
  fastify.get('/calendars', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.userId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    try {
      const calendar = await googleService.getCalendarServiceForUser(request.userId)
      const response = await calendar.calendarList.list()

      return { calendars: response.data.items }
    } catch (error) {
      logger.error('Error fetching calendars:', error)
      return reply.status(500).send({ error: 'Failed to fetch calendars' })
    }
  })
}

export default calendarPlugin
