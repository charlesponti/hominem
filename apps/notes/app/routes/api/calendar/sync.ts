import { type ActionFunctionArgs, json } from 'react-router'
import { GoogleCalendarService } from '~/lib/google/calendar'
import { createServerTRPCClient } from '~/lib/trpc-server'

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
      return json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(accessToken, refreshToken)

    // Sync events from Google Calendar
    const events = await calendarService.syncEvents(userId, calendarId, timeMin, timeMax)

    // Create TRPC client to save events to database
    const trpcClient = createServerTRPCClient(accessToken)

    const savedEvents = []
    for (const event of events) {
      try {
        // Check if event already exists
        const existingEvent = await trpcClient.events.getById.query({ id: event.id })

        if (!existingEvent) {
          // Create new event
          const savedEvent = await trpcClient.events.create.mutate(event)
          savedEvents.push(savedEvent)
        } else {
          // Update existing event
          const updatedEvent = await trpcClient.events.update.mutate({
            id: event.id,
            ...event,
          })
          savedEvents.push(updatedEvent)
        }
      } catch (error) {
        console.error(`Error saving event ${event.id}:`, error)
        // Continue with other events even if one fails
      }
    }

    return json({
      success: true,
      syncedEvents: savedEvents.length,
      totalEvents: events.length,
      events: savedEvents,
    })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return json({ error: 'Failed to sync calendar events' }, { status: 500 })
  }
}

export async function loader({ request }: ActionFunctionArgs) {
  try {
    const url = new URL(request.url)
    const accessToken = url.searchParams.get('accessToken')
    const refreshToken = url.searchParams.get('refreshToken')

    if (!accessToken) {
      return json({ error: 'Missing access token' }, { status: 400 })
    }

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService(accessToken, refreshToken)

    // Get available calendars
    const calendars = await calendarService.getCalendarList()

    return json({ calendars })
  } catch (error) {
    console.error('Error fetching calendars:', error)
    return json({ error: 'Failed to fetch calendars' }, { status: 500 })
  }
}
