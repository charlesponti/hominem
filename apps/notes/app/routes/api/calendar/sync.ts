import type { ActionFunctionArgs } from 'react-router'
import { GoogleCalendarService } from '~/lib/google/calendar'
import { jsonResponse } from '~/lib/utils'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData()
    const accessToken = formData.get('accessToken') as string
    const refreshToken = formData.get('refreshToken') as string
    const userId = formData.get('userId') as string
    const calendarId = (formData.get('calendarId') as string) || 'primary'
    const timeMin = formData.get('timeMin') as string
    const timeMax = formData.get('timeMax') as string

    if (!accessToken || !userId) {
      return jsonResponse({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(accessToken, refreshToken)

    // Sync events from Google Calendar
    const events = await calendarService.syncEvents(userId, calendarId, timeMin, timeMax)

    // TODO: Create TRPC client to save events to database when events router is available
    // const trpcClient = createServerTRPCClient(accessToken)

    const savedEvents = []
    for (const event of events) {
      try {
        // For now, just collect the events without saving to database
        // TODO: Implement proper event storage when events router is available
        savedEvents.push(event)
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        // Continue with other events even if one fails
      }
    }

    return jsonResponse({
      success: true,
      syncedEvents: savedEvents.length,
      totalEvents: events.length,
      events: savedEvents,
    })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return jsonResponse({ error: 'Failed to sync calendar events' }, { status: 500 })
  }
}

export async function loader({ request }: ActionFunctionArgs) {
  try {
    const url = new URL(request.url)
    const accessToken = url.searchParams.get('accessToken')
    const refreshToken = url.searchParams.get('refreshToken') ?? undefined

    if (!accessToken) {
      return jsonResponse({ error: 'Missing access token' }, { status: 400 })
    }

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(accessToken, refreshToken)

    // Get available calendars
    const calendars = await calendarService.getCalendarList()

    return jsonResponse({ calendars })
  } catch (error) {
    console.error('Error fetching calendars:', error)
    return jsonResponse({ error: 'Failed to fetch calendars' }, { status: 500 })
  }
}
