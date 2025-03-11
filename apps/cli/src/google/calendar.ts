import {
  getCalendarEvents,
  getEventDateTime,
  getEventDuration,
  listCalendars,
  updateEventName,
} from '@ponti/utils/google-calendar'
import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import { createObjectCsvWriter } from 'csv-writer'
import type { calendar_v3 } from 'googleapis'
import inquirer from 'inquirer'
import { env } from '../env'

const formatEvents = (events: calendar_v3.Schema$Event[]) => {
  return events.map((event) => {
    const dateTime = getEventDateTime(event)
    const duration = getEventDuration(event, dateTime)
    const durationInMinutes = duration ? duration / 1000 / 60 : null
    const eventDateString = dateTime
      ? dateTime.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: '2-digit',
        })
      : ''

    return {
      display: [
        eventDateString,
        event.summary,
        durationInMinutes ? `(${durationInMinutes}m)` : '',
      ].join('   '),
      csvData: {
        date: dateTime?.toISOString() || '',
        summary: event.summary || '',
        description: event.description || '',
        location: event.location || '',
        durationMinutes: durationInMinutes || '',
        status: event.status || '',
        creator: event.creator?.email || '',
        attendees: event.attendees?.map((a) => a.email).join(', ') || '',
        hangoutLink: event.hangoutLink || '',
        id: event.id || '',
      },
    }
  })
}

const exportToCsv = async (events: ReturnType<typeof formatEvents>, filePath: string) => {
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header:
      events.length === 0
        ? []
        : Object.keys(events[0].csvData).map((key) => ({ id: key, title: key.toUpperCase() })),
  })

  await csvWriter.writeRecords(events.map((e) => e.csvData))
  logger.info(`Events exported to ${filePath}`)
}

const selectCalendar = async (message = 'Select a calendar'): Promise<string | null> => {
  const calendars = await listCalendars()
  if (!calendars) {
    logger.error('No calendars found')
    return null
  }

  const choices = calendars.map((cal: calendar_v3.Schema$CalendarListEntry) => ({
    name: cal.summary,
    value: cal.id,
  }))

  const { calendarId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'calendarId',
      message,
      choices,
    },
  ])

  return calendarId
}

export const calendarProgram = new Command()

calendarProgram.name('google-calendar')

calendarProgram
  .command('get-events')
  .description('Fetch events from Google Calendar')
  .option('--tmin, --timeMin <timeMin>', 'Start time (ISO format)')
  .option('--tmax, --timeMax <timeMax>', 'End time (ISO format)')
  .option('-q, --q <q>', 'Query string')
  .option('--csv <file>', 'Export results to CSV file')
  .action(async (options) => {
    try {
      const calendarId = await selectCalendar()
      if (!calendarId) return

      const events = await getCalendarEvents({
        ...options,
        calendarId,
      })

      if (!events) {
        logger.error('No events found')
        return
      }

      logger.info('Calendar events')
      const formattedEvents = formatEvents(events)

      // Display events
      for (const event of formattedEvents) {
        logger.info(event.display)
      }

      // Export to CSV if requested
      if (options.csv) {
        await exportToCsv(formattedEvents, options.csv)
      }
    } catch (error) {
      logger.error('Error fetching calendar events:', error)
    }
  })

calendarProgram
  .command('search')
  .description('Search events in Google Calendar')
  .requiredOption('-q, --query <query>', 'Search query')
  .option('--tmin, --timeMin <timeMin>', 'Start time (ISO format)')
  .option('--tmax, --timeMax <timeMax>', 'End time (ISO format)')
  .option('--csv <file>', 'Export results to CSV file')
  .action(async (options) => {
    try {
      const calendarId = await selectCalendar('Select a calendar to search')
      if (!calendarId) return

      const events = await getCalendarEvents({
        calendarId,
        q: options.query,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
      })

      if (!events || events.length === 0) {
        logger.info('No events found matching your search')
        return
      }

      logger.info(`Found ${events.length} matching events:`)
      const formattedEvents = formatEvents(events)

      // Display events
      for (const event of formattedEvents) {
        logger.info(event.display)
      }

      // Export to CSV if requested
      if (options.csv) {
        await exportToCsv(formattedEvents, options.csv)
      }
    } catch (error) {
      logger.error('Error searching calendar events:', error)
    }
  })

calendarProgram
  .command('list-calendars')
  .description('List all calendars and select one to get its ID')
  .action(async () => {
    try {
      const calendarId = await selectCalendar()
      if (!calendarId) return

      logger.info('Selected calendar ID:', calendarId)
    } catch (error) {
      logger.error('Error listing calendars:', error)
    }
  })

calendarProgram
  .command('update-summary')
  .description('Update the name of an event in Google Calendar')
  .requiredOption('--oldSummary <oldSummary>', 'Old summary for the event')
  .requiredOption('--newSummary <newSummary>', 'New summary for the event')
  .action(async (options) => {
    try {
      const calendarId = await selectCalendar()
      if (!calendarId) return

      const events = await getCalendarEvents({ calendarId, q: options.oldSummary })
      if (!events || events.length === 0) {
        logger.error('No events found with the old summary provided')
        return
      }

      for (const event of events) {
        if (!event.id) {
          logger.error('Event ID not found')
          continue
        }
        const newSummary = options.oldSummary.replace(options.oldSummary, options.newSummary)

        if (newSummary.length === 0) {
          logger.error('New summary cannot be empty')
          continue
        }

        await updateEventName({
          calendarId,
          eventId: event.id,
          newSummary,
        })
      }

      logger.info(`Event ${options.eventId} name updated to ${options.newSummary}`)
    } catch (error) {
      logger.error('Error updating event name:', error)
    }
  })
