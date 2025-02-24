import {
  getCalendarEvents,
  getEventDateTime,
  getEventDuration,
  listCalendars,
} from '@ponti/utils/google-calendar'
import { getSpreadsheetData } from '@ponti/utils/google-sheets'
import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import type { calendar_v3 } from 'googleapis'
import inquirer from 'inquirer'

const program = new Command()

program.name('google')

program
  .command('sheets')
  .description('Fetch data from a Google Sheet')
  .requiredOption('-s, --spreadsheetId <spreadsheetId>', 'Spreadsheet ID')
  .requiredOption('-r, --range <range>', 'Range to fetch data from')
  .action(async (options) => {
    try {
      const data = await getSpreadsheetData(options)
      logger.info('Spreadsheet data:', data)
    } catch (error) {
      logger.error('Error fetching spreadsheet data:', error)
    }
  })

const calendarProgram = new Command()

calendarProgram.name('google-calendar')

calendarProgram
  .command('get-events')
  .description('Fetch events from Google Calendar')
  .requiredOption('-c, --calendarId <calendarId>', 'Calendar ID')
  .option('--tmin, --timeMin <timeMin>', 'Start time (ISO format)')
  .option('--tmax, --timeMax <timeMax>', 'End time (ISO format)')
  .option('-q, --q <q>', 'Query string')
  .action(async (options) => {
    try {
      const events = await getCalendarEvents(options)

      if (!events) {
        logger.error('No events found')
        return
      }

      logger.info('Calendar events')
      for (const event of events) {
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

        logger.info(
          [eventDateString, event.summary, durationInMinutes ? `(${durationInMinutes}m)` : ''].join(
            '   '
          )
        )
      }
    } catch (error) {
      logger.error('Error fetching calendar events:', error)
    }
  })

calendarProgram
  .command('list-calendars')
  .description('List all calendars and select one to get its ID')
  .action(async () => {
    try {
      const calendars = await listCalendars()

      if (!calendars) {
        logger.error('No calendars found')
        return
      }

      const choices = calendars.map((cal: calendar_v3.Schema$CalendarListEntry) => ({
        name: cal.summary,
        value: cal.id,
      }))

      const { calendarId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'calendarId',
          message: 'Select a calendar',
          choices,
        },
      ])

      logger.info('Selected calendar ID:', calendarId)
    } catch (error) {
      logger.error('Error listing calendars:', error)
    }
  })

program.addCommand(calendarProgram)

export default program
