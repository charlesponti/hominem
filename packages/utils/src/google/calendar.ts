import { type calendar_v3, google } from 'googleapis'
import { DEFAULT_SCOPES, GoogleOAuthService } from './auth'

export async function listCalendars() {
  const service = new GoogleOAuthService({
    scopes: DEFAULT_SCOPES,
  })
  const client = await service.authorize()

  if (!client) {
    throw new Error('No client found')
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: client })
    const response = await calendar.calendarList.list()

    return response.data.items
  } catch (error) {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const response = (error as { response: { data: Record<string, any> } }).response
    console.error('Error listing calendars:', response.data)

    if (response.data.error === 'invalid_grant') {
      console.error('Invalid grant. Please re-authenticate.')
      await service.reauth()
      return listCalendars()
    }

    return null
  }
}

export async function getCalendarEvents({
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
  const service = new GoogleOAuthService({
    scopes: DEFAULT_SCOPES,
  })
  const client = await service.authorize()

  if (!client) {
    throw new Error('No client found')
  }

  const calendar = google.calendar({ version: 'v3', auth: client })
  const response = await calendar.events.list({
    q,
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return response.data.items
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
