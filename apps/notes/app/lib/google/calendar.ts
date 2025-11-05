import type { CalendarEventInsert } from '@hominem/data'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
  }>
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client
  private calendar: ReturnType<typeof google.calendar>

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async getEvents(
    calendarId = 'primary',
    timeMin?: string,
    timeMax?: string,
    maxResults = 100
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      throw new Error('Failed to fetch Google Calendar events')
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      })

      return response.data
    } catch (error) {
      console.error('Error fetching Google Calendar event:', error)
      return null
    }
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: updates,
      })

      return response.data
    } catch (error) {
      console.error('Error updating Google Calendar event:', error)
      return null
    }
  }

  async getCalendarList(): Promise<Array<{ id: string; summary: string }>> {
    try {
      const response = await this.calendar.calendarList.list()
      return (
        response.data.items?.map((item: { id: string; summary: string }) => ({
          id: item.id,
          summary: item.summary,
        })) || []
      )
    } catch (error) {
      console.error('Error fetching calendar list:', error)
      throw new Error('Failed to fetch calendar list')
    }
  }

  /**
   * Convert Google Calendar event to our internal calendar event format
   */
  convertToCalendarEvent(
    googleEvent: GoogleCalendarEvent,
    userId: string,
    type = 'Events' as const
  ): CalendarEventInsert {
    const startDate = googleEvent.start.dateTime || googleEvent.start.date
    const endDate = googleEvent.end.dateTime || googleEvent.end.date

    return {
      id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description || null,
      date: new Date(startDate),
      dateStart: startDate ? new Date(startDate) : null,
      dateEnd: endDate ? new Date(endDate) : null,
      type,
      userId,
    }
  }

  /**
   * Sync Google Calendar events to our database
   */
  async syncEvents(
    userId: string,
    calendarId = 'primary',
    timeMin?: string,
    timeMax?: string
  ): Promise<CalendarEventInsert[]> {
    const googleEvents = await this.getEvents(calendarId, timeMin, timeMax)

    return googleEvents.map((event) => this.convertToCalendarEvent(event, userId))
  }
}
