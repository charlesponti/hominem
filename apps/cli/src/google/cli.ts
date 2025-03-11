import { getSpreadsheetData } from '@ponti/utils/google-sheets'
import { logger } from '@ponti/utils/logger'
import { Command } from 'commander'
import { calendarProgram } from './calendar'

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

program.addCommand(calendarProgram)

export default program
