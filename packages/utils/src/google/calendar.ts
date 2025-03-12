import { google, type calendar_v3 } from 'googleapis'
import { DEFAULT_SCOPES, GoogleOAuthService } from './auth'

export class GoogleCalendarService {
  private async getAuthorizedClient() {
    const service = new GoogleOAuthService({
      scopes: DEFAULT_SCOPES,
    })

    try {
      const client = await service.authorize()
      return client
    } catch (error) {
      throw new Error(`Failed to authorize: ${(error as Error).message}`)
    }
  }

  async listCalendars() {
    const client = await this.getAuthorizedClient()
    const calendar = google.calendar({ version: 'v3', auth: client })

    try {
      const response = await calendar.calendarList.list()
      return response.data.items
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      if (err.response?.data?.error === 'invalid_grant') {
        throw new Error('Authentication expired. Please authenticate again.')
      }
      throw error
    }
  }

  async getCalendarEvents({
    calendarId,
    q,
    timeMin,
    timeMax,
  }: {
    calendarId: string
    timeMin?: string
    timeMax?: string
    q?: string
  }) {
    const client = await this.getAuthorizedClient()
    const calendar = google.calendar({ version: 'v3', auth: client })

    try {
      const response = await calendar.events.list({
        q,
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        fields:
          'items(description,end,start,summary,id,attendees,hangoutLink,creator,location,organizer,recurrence,recurringEventId,htmlLink)',
      })
      return response.data.items
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      if (err.response?.data?.error === 'invalid_grant') {
        throw new Error('Authentication expired. Please authenticate again.')
      }
      throw error
    }
  }

  async updateEventName({
    calendarId,
    eventId,
    newSummary,
  }: { calendarId: string; eventId: string; newSummary: string }) {
    const client = await this.getAuthorizedClient()
    const calendar = google.calendar({ version: 'v3', auth: client })

    try {
      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          summary: newSummary,
        },
      })
      return response.data
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      if (err.response?.data?.error === 'invalid_grant') {
        throw new Error('Authentication expired. Please authenticate again.')
      }
      throw error
    }
  }
}

// Singleton instance management
let calendarService: GoogleCalendarService | null = null

// Exported functions that match the previous API
export async function listCalendars() {
  if (!calendarService) {
    calendarService = new GoogleCalendarService()
  }
  return calendarService.listCalendars()
}

export async function getCalendarEvents({
  ...params
}: {
  calendarId: string
  timeMin?: string
  timeMax?: string
  q?: string
  headers?: { [key: string]: string }
}) {
  if (!calendarService) {
    calendarService = new GoogleCalendarService()
  }
  return calendarService.getCalendarEvents(params)
}

export const getEventDateTime = (event: calendar_v3.Schema$Event): Date | null => {
  if (event.start?.dateTime) return new Date(event.start.dateTime)
  if (event.start?.date) return new Date(event.start.date)
  return null
}

export const getEventDuration = (
  event: calendar_v3.Schema$Event,
  startDate: Date | null
): number | null => {
  if (!event.end?.dateTime || !startDate) return null
  return new Date(event.end.dateTime).getTime() - startDate.getTime()
}

export async function updateEventName({
  calendarId,
  eventId,
  newSummary,
}: { calendarId: string; eventId: string; newSummary: string }) {
  if (!calendarService) {
    calendarService = new GoogleCalendarService()
  }
  return calendarService.updateEventName({ calendarId, eventId, newSummary })
}
